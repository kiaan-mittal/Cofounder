import "server-only";

import { showcaseSnapshot } from "@/lib/showcase-seed";
import { createServerSupabase } from "@/lib/supabase/server";
import { readGithubSession } from "@/server/github-oauth";
import {
  findUserByLogin,
  resolveActiveProject,
  workspaceFromProject,
} from "@/server/projects";

export async function loadLegacyWorkspace(login: string) {
  const supabase = createServerSupabase();
  if (!supabase || !login) return null;

  const { data } = await supabase
    .from("workspaces")
    .select("website, github, docs_url, snapshot, updated_at")
    .eq("device_id", login)
    .maybeSingle();

  if (!data) return null;
  return {
    id: login,
    name: login,
    website: data.website || "",
    github: data.github || "",
    docs_url: data.docs_url || "",
    snapshot:
      data.snapshot && typeof data.snapshot === "object"
        ? (data.snapshot as Record<string, unknown>)
        : {},
    updated_at: data.updated_at,
  };
}

async function loadOwnedSnapshot(login: string) {
  const user = await findUserByLogin(login);
  if (user) {
    const project = await resolveActiveProject(user.id);
    if (project) {
      const snapshot = workspaceFromProject(project).snapshot;
      if (snapshot && typeof snapshot === "object") return snapshot;
    }
  }

  const legacy = await loadLegacyWorkspace(login);
  if (!legacy?.snapshot || typeof legacy.snapshot !== "object") return null;
  return legacy.snapshot;
}

/**
 * Snapshot for a page render.
 *
 * Signed-in users get their project. Everyone else gets the public
 * IndieTerminal floor so `/webmcp` and `/arena` are never an empty room on
 * the Vercel deploy. The showcase is not written to any account.
 */
export async function loadWorkspaceSnapshot(): Promise<Record<
  string,
  unknown
> | null> {
  const session = await readGithubSession();
  if (!session) return showcaseSnapshot();

  return (await loadOwnedSnapshot(session.login)) as Record<
    string,
    unknown
  > | null;
}

export async function resolvePageWorkspace(): Promise<{
  snapshot: Record<string, unknown> | null;
  guest: boolean;
}> {
  const session = await readGithubSession();
  if (!session) {
    return { snapshot: showcaseSnapshot(), guest: true };
  }
  return {
    snapshot: (await loadOwnedSnapshot(session.login)) as Record<
      string,
      unknown
    > | null,
    guest: false,
  };
}
