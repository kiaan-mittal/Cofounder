import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

import type { GithubIdentity } from "@/lib/github";
import { composioConfigured } from "@/server/composio";
import { githubCredentials } from "@/server/github-credentials";

const SESSION_COOKIE = "da_github";
const STATE_COOKIE = "da_github_state";
const PROJECT_COOKIE = "da_project";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const STATE_MAX_AGE = 60 * 10;

export interface GithubSession extends GithubIdentity {
  accessToken: string;
  composioUserId?: string;
}

interface OauthState {
  nonce: string;
  returnTo: string;
  origin: string;
  composioUserId?: string;
  composioConnectionId?: string;
}

export function githubOAuthConfigured(): boolean {
  return Boolean(githubCredentials() || composioConfigured());
}

export function githubCallbackUrl(): string {
  const explicit = process.env.GITHUB_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const stored = githubCredentials()?.callbackUrl?.trim();
  if (stored) return stored;
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/api/auth/github/callback`;
}

export function publicGithubIdentity(
  session: GithubSession | null,
): GithubIdentity | null {
  if (!session) return null;
  return {
    login: session.login,
    name: session.name,
    avatar: session.avatar,
    githubId: session.githubId,
  };
}

export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/arena",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export function safeReturnOrigin(
  value: string | null | undefined,
  fallback: string,
): string {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
    const allowed = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (allowed && url.origin === new URL(allowed).origin) return url.origin;
  } catch {
    /* use fallback */
  }
  return fallback;
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function sessionKey() {
  const material =
    githubCredentials()?.clientSecret ||
    process.env.GITHUB_TOKEN?.trim() ||
    "decision-arena-github-dev";
  return createHash("sha256").update(material).digest();
}

export function sealSecret(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), "utf8")),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}

export function openSecret<T>(value: string): T | null {
  try {
    const buf = Buffer.from(value, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function readGithubSession(): Promise<GithubSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = openSecret<GithubSession>(raw);
  if (!session?.login) return null;
  if (!session.accessToken && !session.composioUserId) return null;
  return session;
}

export async function writeGithubSession(session: GithubSession) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sealSecret(session), {
    ...cookieBase(),
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearGithubSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PROJECT_COOKIE);
}

export async function readProjectCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(PROJECT_COOKIE)?.value?.trim();
  return value || null;
}

export async function writeProjectCookie(projectId: string) {
  const jar = await cookies();
  jar.set(PROJECT_COOKIE, projectId, {
    ...cookieBase(),
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearProjectCookie() {
  const jar = await cookies();
  jar.delete(PROJECT_COOKIE);
}

export async function writeOauthState(state: OauthState) {
  const jar = await cookies();
  jar.set(STATE_COOKIE, sealSecret(state), {
    ...cookieBase(),
    maxAge: STATE_MAX_AGE,
  });
}

export async function consumeOauthState(): Promise<OauthState | null> {
  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!raw) return null;
  return openSecret<OauthState>(raw);
}

export function authorizeUrl(nonce: string): string {
  const credentials = githubCredentials();
  if (!credentials) {
    throw new Error("GitHub login is not configured.");
  }
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: githubCallbackUrl(),
    // read:user identifies the account. repo is the least GitHub grants for
    // listing and reading private repositories (there is no read-only private
    // scope on classic OAuth apps). Nothing is written back to GitHub.
    scope: "read:user repo",
    state: nonce,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(
  code: string,
): Promise<GithubSession> {
  const credentials = githubCredentials();
  if (!credentials) {
    throw new Error("GitHub login is not configured.");
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: githubCallbackUrl(),
      }),
      cache: "no-store",
    },
  );

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    throw new Error(
      tokenPayload.error_description ||
        tokenPayload.error ||
        "GitHub did not return an access token.",
    );
  }

  return sessionFromAccessToken(tokenPayload.access_token);
}

export async function sessionFromAccessToken(
  accessToken: string,
): Promise<GithubSession> {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${accessToken}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "DecisionArena/1.0",
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
    throw new Error("GitHub signed you in, but the account could not be read.");
  }

  const user = (await userResponse.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
  };

  if (!user.login) {
    throw new Error("GitHub signed you in, but the account had no login.");
  }

  return {
    accessToken,
    login: user.login,
    name: user.name ?? null,
    avatar: user.avatar_url ?? null,
    githubId: typeof user.id === "number" ? user.id : undefined,
  };
}
