import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { readGithubSession } from "@/server/github-oauth";

const GUEST_COOKIE = "da_export_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;
const GUEST_RE = /^da_guest_[a-f0-9]{32}$/;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/**
 * Slack and Notion connect through Composio, not GitHub. A guest cookie is
 * enough to start that OAuth, so a judge on the public floor can send a
 * decision without signing in.
 */
export async function resolveExportUser(): Promise<{
  userId: string;
  signedIn: boolean;
}> {
  const session = await readGithubSession();
  if (session) {
    return {
      userId: session.composioUserId || `da_export_${session.login}`,
      signedIn: true,
    };
  }

  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value?.trim() ?? "";
  if (GUEST_RE.test(existing)) {
    return { userId: existing, signedIn: false };
  }

  const userId = `da_guest_${randomBytes(16).toString("hex")}`;
  jar.set(GUEST_COOKIE, userId, {
    ...cookieBase(),
    maxAge: GUEST_MAX_AGE,
  });
  return { userId, signedIn: false };
}
