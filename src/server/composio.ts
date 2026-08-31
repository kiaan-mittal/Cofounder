import "server-only";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Composio } from "@composio/core";

const AUTH_FILE = join(process.cwd(), ".composio-github.local.json");
const GITHUB_SCOPES = "read:user repo";

let client: Composio | null = null;
let authConfigId: string | null = null;

export function composioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

export function getComposio(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not set.");
  }
  if (!client) {
    client = new Composio({ apiKey });
  }
  return client;
}

function readCachedAuthConfigId(): string | null {
  const fromEnv = process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    if (!existsSync(AUTH_FILE)) return null;
    const raw = JSON.parse(readFileSync(AUTH_FILE, "utf8")) as {
      authConfigId?: string;
    };
    return raw.authConfigId?.trim() || null;
  } catch {
    return null;
  }
}

function writeCachedAuthConfigId(id: string) {
  try {
    writeFileSync(
      AUTH_FILE,
      `${JSON.stringify({ authConfigId: id }, null, 2)}\n`,
      "utf8",
    );
  } catch {
    /* local cache is optional */
  }
}

export async function githubAuthConfigId(): Promise<string> {
  if (authConfigId) return authConfigId;
  const cached = readCachedAuthConfigId();
  if (cached) {
    authConfigId = cached;
    return cached;
  }

  const composio = getComposio();
  const listed = await composio.authConfigs.list({
    toolkit: "github",
  });
  const items = listed.items ?? [];
  const existing = items.find((item) => {
    const toolkit = item.toolkit as unknown;
    const slug =
      typeof toolkit === "string"
        ? toolkit
        : toolkit && typeof toolkit === "object" && "slug" in toolkit
          ? String((toolkit as { slug?: string }).slug ?? "")
          : "";
    return slug === "github";
  });
  if (existing?.id) {
    authConfigId = existing.id;
    writeCachedAuthConfigId(existing.id);
    return existing.id;
  }

  const created = await composio.authConfigs.create("github", {
    type: "use_composio_managed_auth",
    name: "Decision Arena GitHub",
    credentials: { scopes: GITHUB_SCOPES },
  });
  authConfigId = created.id;
  writeCachedAuthConfigId(created.id);
  return created.id;
}

export async function startGithubConnect(
  userId: string,
  callbackUrl: string,
) {
  const composio = getComposio();
  const authConfigId = await githubAuthConfigId();
  return composio.connectedAccounts.link(userId, authConfigId, {
    callbackUrl,
    allowMultiple: true,
  });
}

export async function waitForGithubConnection(
  connectionId: string,
  timeoutMs = 90_000,
) {
  const composio = getComposio();
  return composio.connectedAccounts.waitForConnection(connectionId, timeoutMs);
}

type CachedSession = {
  session: Awaited<ReturnType<Composio["create"]>>;
  at: number;
};

const sessions = new Map<string, CachedSession>();

export async function composioGithubSession(userId: string) {
  const hit = sessions.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.session;
  const session = await getComposio().create(userId, {
    toolkits: ["github"],
  });
  sessions.set(userId, { session, at: Date.now() });
  return session;
}

export async function composioGithubProxy(input: {
  userId: string;
  endpoint: string;
  accept?: string;
}): Promise<{ status: number; data: unknown }> {
  const session = await composioGithubSession(input.userId);
  const parameters = [
    {
      name: "Accept",
      value: input.accept || "application/vnd.github+json",
      in: "header" as const,
    },
    {
      name: "X-GitHub-Api-Version",
      value: "2022-11-28",
      in: "header" as const,
    },
  ];
  const response = await session.proxyExecute({
    toolkit: "github",
    endpoint: input.endpoint,
    method: "GET",
    parameters,
  });
  return {
    status: response.status,
    data: response.data,
  };
}
