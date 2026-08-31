import "server-only";

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

export async function loadWorkspaceSnapshot(): Promise<Record<
  string,
  unknown
> | null> {
  const session = await readGithubSession();
  if (!session) return null;

  const user = await findUserByLogin(session.login);
  if (user) {
    const project = await resolveActiveProject(user.id);
    if (project) {
      const snapshot = workspaceFromProject(project).snapshot;
      if (snapshot && typeof snapshot === "object") return snapshot;
    }
  }

  const legacy = await loadLegacyWorkspace(session.login);
  if (!legacy?.snapshot || typeof legacy.snapshot !== "object") return null;
  return legacy.snapshot;
}
