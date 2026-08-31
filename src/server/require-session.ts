import "server-only";

import { redirect } from "next/navigation";

import { readGithubSession } from "@/server/github-oauth";

export async function requireGithubLogin(returnTo = "/arena") {
  const session = await readGithubSession();
  if (!session) {
    const dest = new URLSearchParams({ returnTo });
    redirect(`/login?${dest.toString()}`);
  }
  return session;
}
