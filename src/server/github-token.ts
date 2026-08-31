import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { openSecret, sealSecret } from "@/server/github-oauth";

/**
 * Keep a sealed GitHub token on the user row so the three-day cron can
 * re-read private repositories. Never inserts a stub — that would blank
 * onboarding drafts on the next pull.
 */
export async function persistGithubAccessToken(
  login: string,
  accessToken: string,
) {
  const supabase = createServerSupabase();
  if (!supabase || !login || !accessToken) return;

  const sealed = sealSecret(accessToken);
  const now = new Date().toISOString();

  const users = await supabase
    .from("users")
    .update({ github_token_sealed: sealed, updated_at: now })
    .eq("github_login", login)
    .select("id");

  if (!users.error && users.data && users.data.length > 0) return;

  if (users.error && !/could not find the table|relation .* does not exist/i.test(users.error.message)) {
    console.error(
      "Could not persist GitHub token on user:",
      users.error.message,
    );
  }

  const { data, error: readError } = await supabase
    .from("workspaces")
    .select("device_id")
    .eq("device_id", login)
    .maybeSingle();

  if (readError) {
    console.error(
      "Could not look up workspace for GitHub token:",
      readError.message,
    );
    return;
  }
  if (!data) return;

  const { error } = await supabase
    .from("workspaces")
    .update({
      github_token_sealed: sealed,
      updated_at: now,
    })
    .eq("device_id", login);

  if (error) {
    console.error(
      "Could not persist GitHub token for brain refresh:",
      error.message,
    );
  }
}

export function readSealedGithubToken(
  sealed: string | null | undefined,
): string | undefined {
  if (!sealed) return undefined;
  const token = openSecret<string>(sealed);
  return typeof token === "string" && token.trim() ? token : undefined;
}
