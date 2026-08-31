import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { composioConfigured } from "@/server/composio";
import { githubCredentials } from "@/server/github-credentials";
import { beginComposioGithubLogin } from "@/server/github-login";
import {
  authorizeUrl,
  safeReturnOrigin,
  safeReturnTo,
  writeOauthState,
} from "@/server/github-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const origin = safeReturnOrigin(
    url.searchParams.get("origin") ?? url.origin,
    url.origin,
  );

  if (composioConfigured()) {
    try {
      const redirectUrl = await beginComposioGithubLogin({ returnTo, origin });
      if (redirectUrl) {
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error("Composio GitHub connect failed:", error);
      const dest = new URL("/login", origin);
      dest.searchParams.set("github_error", "composio");
      return NextResponse.redirect(dest);
    }
  }

  if (githubCredentials()) {
    const nonce = randomBytes(16).toString("hex");
    await writeOauthState({
      nonce,
      returnTo,
      origin,
    });
    return NextResponse.redirect(authorizeUrl(nonce));
  }

  const dest = new URL("/login", origin);
  dest.searchParams.set("github_error", "unconfigured");
  if (returnTo && returnTo !== "/login") {
    dest.searchParams.set("returnTo", returnTo);
  }
  return NextResponse.redirect(dest);
}
