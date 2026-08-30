import { NextResponse } from "next/server";

import { pathAfterLogin, shouldUseLoginPath } from "@/server/login-path";
import {
  consumeOauthState,
  exchangeGithubCode,
  writeGithubSession,
} from "@/server/github-oauth";

export const runtime = "nodejs";

function bounce(origin: string, path: string, error: string) {
  const dest = new URL(path, origin);
  dest.searchParams.set("github_error", error);
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

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || state !== stored.nonce) {
    return bounce(origin, returnTo, "state");
  }

  try {
    const session = await exchangeGithubCode(code);
    await writeGithubSession(session);
    const dest = shouldUseLoginPath(returnTo)
      ? await pathAfterLogin(session.login)
      : returnTo;
    return NextResponse.redirect(new URL(dest, origin));
  } catch {
    return bounce(origin, returnTo, "exchange");
  }
}
