import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { pathAfterLogin, shouldUseLoginPath } from "@/server/login-path";
import {
  authorizeUrl,
  githubOAuthConfigured,
  safeReturnOrigin,
  safeReturnTo,
  sessionFromServerToken,
  writeGithubSession,
  writeOauthState,
} from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  if (githubOAuthConfigured()) {
    const nonce = randomBytes(16).toString("hex");
    await writeOauthState({
      nonce,
      returnTo,
      origin: safeReturnOrigin(
        url.searchParams.get("origin") ?? url.origin,
        url.origin,
      ),
    });
    return NextResponse.redirect(authorizeUrl(nonce));
  }

  const session = await sessionFromServerToken();
  if (session) {
    await writeGithubSession(session);
    const dest = shouldUseLoginPath(returnTo)
      ? await pathAfterLogin(session.login)
      : returnTo;
    return NextResponse.redirect(new URL(dest, url.origin));
  }

  const dest = new URL(returnTo, url.origin);
  dest.searchParams.set("github_error", "unconfigured");
  return NextResponse.redirect(dest);
}
