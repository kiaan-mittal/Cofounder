import "server-only";

import { id } from "@/lib/id";
import type { ProjectSummary } from "@/lib/projects";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ProjectRow, UserRow } from "@/lib/supabase/types";
import { githubFetch } from "@/server/github-api";
import {
  readProjectCookie,
  sealSecret,
  writeProjectCookie,
  type GithubSession,
} from "@/server/github-oauth";

export class ProjectAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

function relationMissing(error: { message?: string } | null) {
  return Boolean(
    error?.message &&
      /could not find the table|relation .* does not exist|schema cache/i.test(
        error.message,
      ),
  );
}

function githubSlug(owner: string, repo: string) {
  const left = owner.trim();
  const right = repo.trim();
  if (!left || !right) return "";
  return `${left}/${right}`;
}

const PROJECT_SUMMARY_SELECT =
  "id, name, github_repo_id, github_owner, github_repo_name, website_url, updated_at";

const PROJECT_ROW_SELECT =
  "id, user_id, name, github_repo_id, github_owner, github_repo_name, website_url, docs_url, snapshot, created_at, updated_at";

export function toProjectSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    githubOwner: row.github_owner,
    githubRepoName: row.github_repo_name,
    githubRepoId: row.github_repo_id,
    websiteUrl: row.website_url,
    updatedAt: row.updated_at,
  };
}

export async function upsertGithubUser(
  session: GithubSession,
): Promise<UserRow | null> {
  const supabase = createServerSupabase();
  if (!supabase) return null;

  const githubId =
    typeof session.githubId === "number" && session.githubId > 0
      ? session.githubId
      : null;
  const now = new Date().toISOString();
  const token =
    session.accessToken && session.accessToken.length > 0
      ? sealSecret(session.accessToken)
      : undefined;

  let existing: UserRow | null = null;

  if (githubId) {
    const byId = await supabase
      .from("users")
      .select(
        "id, github_id, github_login, github_name, avatar_url, created_at, updated_at",
      )
      .eq("github_id", githubId)
      .maybeSingle();
    if (relationMissing(byId.error)) return null;
    if (byId.error) {
      console.error("Could not look up user by GitHub id:", byId.error.message);
    } else {
      existing = (byId.data as UserRow | null) ?? null;
    }
  }

  if (!existing) {
    const byLogin = await supabase
      .from("users")
      .select(
        "id, github_id, github_login, github_name, avatar_url, created_at, updated_at",
      )
      .eq("github_login", session.login)
      .maybeSingle();
    if (relationMissing(byLogin.error)) return null;
    if (byLogin.error) {
      console.error(
        "Could not look up user by GitHub login:",
        byLogin.error.message,
      );
    } else {
      existing = (byLogin.data as UserRow | null) ?? null;
    }
  }

  const userId = existing?.id ?? (githubId ? `usr_${githubId}` : `usr_${session.login}`);
  const payload: Record<string, unknown> = {
    id: userId,
    github_login: session.login,
    github_name: session.name,
    avatar_url: session.avatar,
    updated_at: now,
  };
  if (githubId) payload.github_id = githubId;
  if (token) payload.github_token_sealed = token;
  if (session.composioUserId) payload.composio_user_id = session.composioUserId;
  if (!existing) payload.created_at = now;

  const upserted = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, github_id, github_login, github_name, avatar_url, created_at, updated_at",
    )
    .single();

  if (
    upserted.error &&
    /composio_user_id/i.test(upserted.error.message)
  ) {
    delete payload.composio_user_id;
    const retry = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" })
      .select(
        "id, github_id, github_login, github_name, avatar_url, created_at, updated_at",
      )
      .single();
    if (retry.error) {
      if (relationMissing(retry.error)) return null;
      console.error("Could not upsert GitHub user:", retry.error.message);
      return existing;
    }
    return retry.data as UserRow;
  }

  if (upserted.error) {
    if (relationMissing(upserted.error)) return null;
    console.error("Could not upsert GitHub user:", upserted.error.message);
    return existing;
  }

  return upserted.data as UserRow;
}

export async function findUserByLogin(login: string): Promise<UserRow | null> {
  const supabase = createServerSupabase();
  if (!supabase || !login) return null;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, github_id, github_login, github_name, avatar_url, created_at, updated_at",
    )
    .eq("github_login", login)
    .maybeSingle();

  if (error) {
    if (!relationMissing(error)) {
      console.error("Could not find user:", error.message);
    }
    return null;
  }
  return (data as UserRow | null) ?? null;
}

export async function requireUser(
  session: GithubSession,
): Promise<UserRow> {
  const user = (await upsertGithubUser(session)) ?? (await findUserByLogin(session.login));
  if (!user) {
    throw new ProjectAccessError(
      "Your account could not be created. Run the users/projects migration, then sign in again.",
      503,
    );
  }
  return user;
}

export async function listProjectsForUser(
  userId: string,
): Promise<ProjectRow[]> {
  const supabase = createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_ROW_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (!relationMissing(error)) {
      console.error("Could not list projects:", error.message);
    }
    return [];
  }
  return (data ?? []) as ProjectRow[];
}

export async function getOwnedProject(
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  const supabase = createServerSupabase();
  if (!supabase || !projectId) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_ROW_SELECT)
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!relationMissing(error)) {
      console.error("Could not load project:", error.message);
    }
    return null;
  }
  return (data as ProjectRow | null) ?? null;
}

export async function listProjectSummariesForUser(
  userId: string,
): Promise<ProjectSummary[]> {
  const supabase = createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SUMMARY_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (!relationMissing(error)) {
      console.error("Could not list project summaries:", error.message);
    }
    return [];
  }

  return (data ?? []).map((row) =>
    toProjectSummary(row as ProjectRow),
  );
}

export async function loadHeaderProjects(
  session: GithubSession | null,
): Promise<{
  projects: ProjectSummary[];
  activeProjectId: string | null;
}> {
  if (!session) return { projects: [], activeProjectId: null };
  const user = await findUserByLogin(session.login);
  if (!user) return { projects: [], activeProjectId: null };

  const projects = await listProjectSummariesForUser(user.id);
  const requested = await readProjectCookie();
  const active =
    (requested ? projects.find((project) => project.id === requested) : null) ??
    projects[0] ??
    null;

  return {
    projects,
    activeProjectId: active?.id ?? null,
  };
}

export async function resolveActiveProject(
  userId: string,
  options?: { persist?: boolean },
): Promise<ProjectRow | null> {
  const projects = await listProjectSummariesForUser(userId);
  if (projects.length === 0) return null;

  const requested = await readProjectCookie();
  const match = requested
    ? projects.find((project) => project.id === requested)
    : null;
  const active = match ?? projects[0];
  if (options?.persist && active.id !== requested) {
    await writeProjectCookie(active.id);
  }
  return getOwnedProject(userId, active.id);
}

export async function setActiveProject(userId: string, projectId: string) {
  const project = await getOwnedProject(userId, projectId);
  if (!project) {
    throw new ProjectAccessError("That project is not on your account.", 403);
  }
  await writeProjectCookie(project.id);
  return project;
}

async function verifyGithubRepo(
  session: GithubSession,
  owner: string,
  name: string,
  repoId: number,
) {
  const response = await githubFetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    {
      accessToken: session.accessToken || undefined,
      composioUserId: session.composioUserId,
    },
  );

  if (response.status === 404) {
    throw new ProjectAccessError(
      "GitHub could not find that repository on this account.",
      403,
    );
  }
  if (!response.ok) {
    throw new ProjectAccessError(
      "GitHub would not confirm that repository.",
      502,
    );
  }

  const repo = (await response.json()) as {
    id?: number;
    name?: string;
    owner?: { login?: string };
    full_name?: string;
  };

  if (typeof repo.id !== "number" || repo.id !== repoId) {
    throw new ProjectAccessError(
      "That repository does not match the one you selected.",
      403,
    );
  }

  return {
    id: repo.id,
    owner: repo.owner?.login || owner,
    name: repo.name || name,
    fullName: repo.full_name || githubSlug(owner, name),
  };
}

export async function createProjectForUser(
  session: GithubSession,
  input: {
    name: string;
    githubRepoId: number;
    githubOwner: string;
    githubRepoName: string;
    websiteUrl: string;
    docsUrl?: string;
  },
): Promise<ProjectRow> {
  const user = await requireUser(session);
  const repo = await verifyGithubRepo(
    session,
    input.githubOwner,
    input.githubRepoName,
    input.githubRepoId,
  );

  const supabase = createServerSupabase();
  if (!supabase) {
    throw new ProjectAccessError("Supabase is not configured.", 503);
  }

  const byRepoId = await supabase
    .from("projects")
    .select(PROJECT_ROW_SELECT)
    .eq("user_id", user.id)
    .eq("github_repo_id", repo.id)
    .maybeSingle();

  let existing = (byRepoId.data as ProjectRow | null) ?? null;
  if (!existing) {
    const byName = await supabase
      .from("projects")
      .select(PROJECT_ROW_SELECT)
      .eq("user_id", user.id)
      .eq("github_owner", repo.owner)
      .eq("github_repo_name", repo.name)
      .maybeSingle();
    existing = (byName.data as ProjectRow | null) ?? null;
  }

  const now = new Date().toISOString();
  const name = input.name.trim() || repo.name;
  const website = input.websiteUrl.trim();
  const docs = input.docsUrl?.trim() ?? "";

  if (existing) {
    const { data, error } = await supabase
      .from("projects")
      .update({
        name,
        github_repo_id: repo.id,
        github_owner: repo.owner,
        github_repo_name: repo.name,
        website_url: website,
        docs_url: docs,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select(PROJECT_ROW_SELECT)
      .single();

    if (error || !data) {
      throw new ProjectAccessError(
        error?.message || "The existing project could not be updated.",
        500,
      );
    }
    await writeProjectCookie(data.id);
    return data as ProjectRow;
  }

  const row = {
    id: id("prj"),
    user_id: user.id,
    name,
    github_repo_id: repo.id,
    github_owner: repo.owner,
    github_repo_name: repo.name,
    website_url: website,
    docs_url: docs,
    snapshot: {},
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select(PROJECT_ROW_SELECT)
    .single();

  if (error || !data) {
    throw new ProjectAccessError(
      error?.message || "The project could not be created.",
      500,
    );
  }

  await writeProjectCookie(data.id);
  return data as ProjectRow;
}

export async function saveOwnedProject(
  userId: string,
  projectId: string,
  patch: {
    website?: string;
    github?: string;
    docsUrl?: string;
    snapshot?: Record<string, unknown>;
    name?: string;
  },
): Promise<ProjectRow> {
  const project = await getOwnedProject(userId, projectId);
  if (!project) {
    throw new ProjectAccessError("That project is not on your account.", 403);
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    throw new ProjectAccessError("Supabase is not configured.", 503);
  }

  const next: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.website !== undefined) next.website_url = patch.website;
  if (patch.docsUrl !== undefined) next.docs_url = patch.docsUrl;
  if (patch.snapshot !== undefined) next.snapshot = patch.snapshot;
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.github !== undefined) {
    const [owner, ...rest] = patch.github.split("/");
    if (owner && rest.length) {
      next.github_owner = owner;
      next.github_repo_name = rest.join("/");
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update(next)
    .eq("id", project.id)
    .eq("user_id", userId)
    .select(PROJECT_ROW_SELECT)
    .single();

  if (error || !data) {
    throw new ProjectAccessError(
      error?.message || "The project could not be saved.",
      500,
    );
  }
  return data as ProjectRow;
}

export function githubFullName(row: Pick<ProjectRow, "github_owner" | "github_repo_name">) {
  return githubSlug(row.github_owner, row.github_repo_name);
}

export function workspaceFromProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    website: row.website_url,
    github: githubFullName(row),
    docs_url: row.docs_url,
    snapshot:
      row.snapshot && typeof row.snapshot === "object"
        ? (row.snapshot as Record<string, unknown>)
        : {},
    updated_at: row.updated_at,
  };
}
