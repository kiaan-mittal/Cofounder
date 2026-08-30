import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

export async function pathAfterLogin(login: string): Promise<string> {
  const supabase = createServerSupabase();
  if (!supabase) return "/arena";

  const { data } = await supabase
    .from("workspaces")
    .select("snapshot")
    .eq("device_id", login)
    .maybeSingle();

  const snapshot = data?.snapshot as { company?: unknown } | null;
  return snapshot?.company ? "/arena" : "/onboarding";
}

export function shouldUseLoginPath(returnTo: string | null | undefined) {
  return !returnTo || returnTo === "/" || returnTo === "/arena";
}
