import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface GithubOauthCredentials {
  clientId: string;
  clientSecret: string;
  callbackUrl?: string;
}

const FILE = join(process.cwd(), ".github-oauth.local.json");

function fromEnv(): GithubOauthCredentials | null {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function fromFile(): GithubOauthCredentials | null {
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as GithubOauthCredentials;
    if (raw.clientId && raw.clientSecret) return raw;
  } catch {
    /* no local credentials file */
  }
  return null;
}

export function githubCredentials(): GithubOauthCredentials | null {
  return fromEnv() ?? fromFile();
}
