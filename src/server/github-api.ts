import "server-only";

import { composioConfigured, composioGithubProxy } from "@/server/composio";

export type GithubAuth = {
  accessToken?: string;
  composioUserId?: string;
};

export function hasGithubUserAuth(auth?: GithubAuth | null) {
  return Boolean(auth?.composioUserId || auth?.accessToken);
}

function githubPath(url: string) {
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function asText(data: unknown) {
  if (typeof data === "string") return data;
  if (data == null) return "";
  if (typeof data === "object") return JSON.stringify(data);
  return String(data);
}

export async function githubFetch(
  url: string,
  auth?: GithubAuth,
  extra: { accept?: string } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> {
  const accept = extra.accept || "application/vnd.github+json";

  if (auth?.composioUserId && composioConfigured()) {
    const { status, data } = await composioGithubProxy({
      userId: auth.composioUserId,
      endpoint: githubPath(url),
      accept,
    });
    const text = asText(data);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () =>
        typeof data === "string"
          ? (JSON.parse(data) as unknown)
          : data,
      text: async () => text,
    };
  }

  const headers: Record<string, string> = {
    accept,
    "x-github-api-version": "2022-11-28",
    "user-agent": "DecisionArena/1.0",
  };
  const token = auth?.accessToken || process.env.GITHUB_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers, cache: "no-store" });
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json() as Promise<unknown>,
    text: () => response.text(),
  };
}
