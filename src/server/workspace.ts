import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { readGithubSession } from "@/server/github-oauth";

export async function loadWorkspaceSnapshot(): Promise<Record<
  string,
  unknown
> | null> {
  const session = await readGithubSession();
  const supabase = createServerSupabase();
  if (!session || !supabase) return null;

  const { data } = await supabase
    .from("workspaces")
    .select("snapshot")
    .eq("device_id", session.login)
    .maybeSingle();

  const snapshot = data?.snapshot;
  if (!snapshot || typeof snapshot !== "object") return null;
  return snapshot as Record<string, unknown>;
}
