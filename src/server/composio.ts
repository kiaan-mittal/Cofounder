import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Composio } from "@composio/core";

export const COMPOSIO_TOOLKITS = ["github", "slack", "notion"] as const;
export type ComposioToolkit = (typeof COMPOSIO_TOOLKITS)[number];

const AUTH_FILE = join(process.cwd(), ".composio-auth.local.json");
const LEGACY_GITHUB_FILE = join(process.cwd(), ".composio-github.local.json");
const GITHUB_SCOPES = "read:user repo";

const AUTH_NAMES: Record<ComposioToolkit, string> = {
  github: "Decision Arena GitHub",
  slack: "Decision Arena Slack",
  notion: "Decision Arena Notion",
};

const ENV_AUTH_IDS: Record<ComposioToolkit, string> = {
  github: "COMPOSIO_GITHUB_AUTH_CONFIG_ID",
  slack: "COMPOSIO_SLACK_AUTH_CONFIG_ID",
  notion: "COMPOSIO_NOTION_AUTH_CONFIG_ID",
};

type AuthCache = {
  keyFingerprint?: string;
  ids?: Partial<Record<ComposioToolkit, string>>;
  /** @deprecated old single-id cache */
  authConfigId?: string;
};

let client: Composio | null = null;
let clientKey: string | null = null;
const resolvedIds = new Map<string, string>();

export function composioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.COMPOSIO_API_KEY?.trim();
  if (!key) throw new Error("COMPOSIO_API_KEY is not set.");
  return key;
}

function keyFingerprint(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function getComposio(): Composio {
  const key = apiKey();
  if (!client || clientKey !== key) {
    client = new Composio({ apiKey: key });
    clientKey = key;
    resolvedIds.clear();
    sessions.clear();
  }
  return client;
}

function toolkitSlug(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (value && typeof value === "object" && "slug" in value) {
    return String((value as { slug?: string }).slug ?? "").toLowerCase();
  }
  return "";
}

function readAuthCache(): AuthCache {
  const empty: AuthCache = {};
  for (const path of [AUTH_FILE, LEGACY_GITHUB_FILE]) {
    try {
      if (!existsSync(path)) continue;
      return JSON.parse(readFileSync(path, "utf8")) as AuthCache;
    } catch {
      /* ignore broken cache */
    }
  }
  return empty;
}

function writeAuthCache(fingerprint: string, toolkit: ComposioToolkit, id: string) {
  const current = readAuthCache();
  const ids = {
    ...(current.keyFingerprint === fingerprint ? current.ids : {}),
    [toolkit]: id,
  };
  try {
    writeFileSync(
      AUTH_FILE,
      `${JSON.stringify({ keyFingerprint: fingerprint, ids }, null, 2)}\n`,
      "utf8",
    );
  } catch {
    /* local cache is optional */
  }
}

function envAuthConfigId(toolkit: ComposioToolkit): string | null {
  return process.env[ENV_AUTH_IDS[toolkit]]?.trim() || null;
}

export async function resolveAuthConfigId(
  toolkit: ComposioToolkit,
): Promise<string> {
  const key = apiKey();
  const fingerprint = keyFingerprint(key);
  const memoryKey = `${fingerprint}:${toolkit}`;
  const remembered = resolvedIds.get(memoryKey);
  if (remembered) return remembered;

  const listed = await getComposio().authConfigs.list({
    toolkit,
    showDisabled: true,
  });
  const items = (listed.items ?? []).filter((item) => {
    const slug = toolkitSlug(item.toolkit);
    return (!slug || slug === toolkit) && item.status !== "DISABLED";
  });
  const liveIds = new Set(items.map((item) => item.id).filter(Boolean));

  const cache = readAuthCache();
  const cachedId =
    cache.keyFingerprint === fingerprint
      ? cache.ids?.[toolkit]
      : toolkit === "github"
        ? cache.authConfigId
        : undefined;

  const candidates = [envAuthConfigId(toolkit), cachedId].filter(
    (id): id is string => Boolean(id),
  );
  for (const id of candidates) {
    if (liveIds.has(id)) {
      resolvedIds.set(memoryKey, id);
      writeAuthCache(fingerprint, toolkit, id);
      return id;
    }
  }

  const named = items.find((item) =>
    /decision arena/i.test(item.name ?? ""),
  );
  if (named?.id) {
    resolvedIds.set(memoryKey, named.id);
    writeAuthCache(fingerprint, toolkit, named.id);
    return named.id;
  }

  if (items[0]?.id) {
    resolvedIds.set(memoryKey, items[0].id);
    writeAuthCache(fingerprint, toolkit, items[0].id);
    return items[0].id;
  }

  const created = await getComposio().authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
    name: AUTH_NAMES[toolkit],
    ...(toolkit === "github"
      ? { credentials: { scopes: GITHUB_SCOPES } }
      : {}),
  });
  resolvedIds.set(memoryKey, created.id);
  writeAuthCache(fingerprint, toolkit, created.id);
  return created.id;
}

export async function sessionAuthConfigs(
  toolkits: readonly ComposioToolkit[],
): Promise<Partial<Record<ComposioToolkit, string>>> {
  const entries = await Promise.all(
    toolkits.map(async (toolkit) => [toolkit, await resolveAuthConfigId(toolkit)] as const),
  );
  return Object.fromEntries(entries);
}

export async function githubAuthConfigId(): Promise<string> {
  return resolveAuthConfigId("github");
}

export async function startGithubConnect(
  userId: string,
  callbackUrl: string,
) {
  const composio = getComposio();
  const authConfigId = await resolveAuthConfigId("github");
  return composio.connectedAccounts.link(userId, authConfigId, {
    callbackUrl,
    allowMultiple: true,
  });
}

export async function waitForGithubConnection(
  connectionId: string,
  timeoutMs = 90_000,
) {
  return getComposio().connectedAccounts.waitForConnection(
    connectionId,
    timeoutMs,
  );
}

type CachedSession = {
  session: Awaited<ReturnType<Composio["create"]>>;
  at: number;
};

const sessions = new Map<string, CachedSession>();

export async function composioGithubSession(userId: string) {
  const hit = sessions.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.session;
  const authConfigs = await sessionAuthConfigs(["github"]);
  const session = await getComposio().create(userId, {
    toolkits: ["github"],
    authConfigs,
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
