import { NextResponse } from "next/server";

import { destinationAfterAuth } from "@/server/login-path";
import {
  consumeOauthState,
  exchangeGithubCode,
  writeGithubSession,
} from "@/server/github-oauth";
import { sessionFromComposioUser } from "@/server/github-login";
import { persistGithubAccessToken } from "@/server/github-token";
import { upsertGithubUser } from "@/server/projects";

export const runtime = "nodejs";

function bounce(origin: string, path: string, error: string) {
  const dest = new URL("/login", origin);
  dest.searchParams.set("github_error", error);
  if (path && path !== "/login") dest.searchParams.set("returnTo", path);
  return NextResponse.redirect(dest);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fallbackOrigin = url.origin;
  const stored = await consumeOauthState();
  const origin = stored?.origin || fallbackOrigin;
  const returnTo = stored?.returnTo || "/arena";

  if (url.searchParams.get("error")) {
    return bounce(origin, returnTo, "denied");
  }

  if (stored?.composioUserId) {
    try {
      const session = await sessionFromComposioUser(
        stored.composioUserId,
        stored.composioConnectionId,
      );
      await writeGithubSession(session);
      await upsertGithubUser(session);
      if (session.accessToken) {
        await persistGithubAccessToken(session.login, session.accessToken);
      }
      const dest = await destinationAfterAuth(session.login, returnTo);
      return NextResponse.redirect(new URL(dest, origin));
    } catch (error) {
      console.error("Composio GitHub callback failed:", error);
      return bounce(origin, returnTo, "exchange");
    }
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || state !== stored.nonce) {
    return bounce(origin, returnTo, "state");
  }

  try {
    const session = await exchangeGithubCode(code);
    await writeGithubSession(session);
    await upsertGithubUser(session);
    await persistGithubAccessToken(session.login, session.accessToken);
    const dest = await destinationAfterAuth(session.login, returnTo);
    return NextResponse.redirect(new URL(dest, origin));
  } catch {
    return bounce(origin, returnTo, "exchange");
  }
}
