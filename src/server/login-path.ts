import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { findUserByLogin, listProjectSummariesForUser } from "@/server/projects";

export async function pathAfterLogin(login: string): Promise<string> {
  const user = await findUserByLogin(login);
  if (user) {
    const projects = await listProjectSummariesForUser(user.id);
    if (projects.length > 0) return "/arena";
  }

  const supabase = createServerSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("workspaces")
      .select("snapshot")
      .eq("device_id", login)
      .maybeSingle();
    const snapshot = data?.snapshot as { company?: unknown } | null;
    if (snapshot?.company) return "/arena";
  }

  return "/onboarding";
}

export function shouldUseLoginPath(returnTo: string | null | undefined) {
  return (
    !returnTo ||
    returnTo === "/" ||
    returnTo === "/arena" ||
    returnTo === "/login" ||
    returnTo === "/onboarding"
  );
}

export async function destinationAfterAuth(
  login: string,
  returnTo: string,
): Promise<string> {
  const home = await pathAfterLogin(login);
  if (home === "/onboarding") return "/onboarding";
  if (shouldUseLoginPath(returnTo)) return home;
  return returnTo;
}
