import "server-only";

import {
  getComposio,
  sessionAuthConfigs,
  type ComposioToolkit,
} from "@/server/composio";

export const EXPORT_TOOLKITS = ["slack", "notion"] as const;
export type ExportToolkit = (typeof EXPORT_TOOLKITS)[number];

export const EXPORT_LOGOS: Record<ExportToolkit, string> = {
  slack: "https://logos.composio.dev/api/slack",
  notion: "https://logos.composio.dev/api/notion",
};

function toolkitSlug(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (value && typeof value === "object" && "slug" in value) {
    return String((value as { slug?: string }).slug ?? "").toLowerCase();
  }
  return "";
}

export function needsExportAuth(error?: string) {
  return /no active connection|not connected|no connected account|auth/i.test(
    error ?? "",
  );
}

async function exportSession(userId: string, toolkits: readonly ComposioToolkit[]) {
  const authConfigs = await sessionAuthConfigs(toolkits);
  return getComposio().create(userId, {
    toolkits: [...toolkits],
    authConfigs,
  });
}

export async function startExportConnect(
  userId: string,
  toolkit: ExportToolkit,
  callbackUrl: string,
) {
  const session = await exportSession(userId, [toolkit]);
  return session.authorize(toolkit, { callbackUrl });
}

export async function waitForExportConnection(
  connectionId: string,
  timeoutMs = 90_000,
) {
  return getComposio().connectedAccounts.waitForConnection(
    connectionId,
    timeoutMs,
  );
}

export async function connectedExportToolkits(
  userId: string,
): Promise<ExportToolkit[]> {
  try {
    const session = await exportSession(userId, [...EXPORT_TOOLKITS]);
    const listed = await session.toolkits();
    const items = listed.items ?? [];
    return EXPORT_TOOLKITS.filter((toolkit) =>
      items.some((item) => {
        const slug = toolkitSlug(item.slug);
        const connection = item.connection as
          | { isActive?: boolean; connectedAccount?: { id?: string } }
          | undefined;
        return (
          slug === toolkit &&
          Boolean(connection?.isActive || connection?.connectedAccount?.id)
        );
      }),
    );
  } catch {
    return [];
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function plain(value: unknown): unknown {
  const seen = new WeakSet<object>();
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, next) => {
        if (typeof next === "bigint") return String(next);
        if (typeof next === "object" && next) {
          if (seen.has(next)) return undefined;
          seen.add(next);
        }
        return next;
      }),
    );
  } catch {
    return null;
  }
}

function executeOk(result: unknown): { ok: boolean; error?: string; data: unknown } {
  const record = asRecord(result);
  const error =
    typeof record.error === "string"
      ? record.error
      : typeof record.message === "string"
        ? record.message
        : undefined;
  if (record.successful === false) {
    return { ok: false, error: error || "The export did not complete.", data: plain(record.data) };
  }
  if (error && needsExportAuth(error)) {
    return { ok: false, error, data: plain(record.data) };
  }
  return { ok: true, data: plain(record.data ?? null) };
}

async function executeTool(
  session: { execute: (slug: string, args: Record<string, unknown>) => Promise<unknown> },
  slug: string,
  args: Record<string, unknown>,
) {
  try {
    return executeOk(await session.execute(slug, args));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The export did not complete.";
    return { ok: false, error: message, data: null };
  }
}

const NOTION_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SLACK_CHANNEL_ID = /^[CGD][A-Z0-9]{8,}$/i;

function pickId(value: string): string | null {
  const trimmed = value.trim();
  const notion = trimmed.match(NOTION_ID);
  if (notion) return notion[0];
  if (SLACK_CHANNEL_ID.test(trimmed)) return trimmed;
  return null;
}

function findId(value: unknown, depth = 0, seen = new WeakSet<object>()): string | null {
  if (value == null || depth > 6) return null;
  if (typeof value === "string") {
    if (value.length > 8 && value.length < 400 && !value.trim().startsWith("{")) {
      return pickId(value);
    }
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        return findId(JSON.parse(value), depth + 1, seen);
      } catch {
        return pickId(value);
      }
    }
    return pickId(value);
  }
  if (typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 25)) {
      const found = findId(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  const record = asRecord(value);
  for (const key of ["id", "page_id", "parent_id", "channel", "channel_id"]) {
    const hit = record[key];
    if (typeof hit === "string") {
      const found = pickId(hit);
      if (found) return found;
    }
  }
  for (const nested of ["data", "results", "items", "pages", "channels"]) {
    const found = findId(record[nested], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

export async function exportViaComposio(input: {
  userId: string;
  toolkit: ExportToolkit;
  title: string;
  markdown: string;
  channel?: string;
  parent?: string;
}): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const session = await exportSession(input.userId, [input.toolkit]);
    const markdown = input.markdown.slice(0, 3900);

    if (input.toolkit === "slack") {
      const channel = input.channel?.replace(/^#/, "").trim() || "general";
      const sent = await executeTool(session, "SLACK_SEND_MESSAGE", {
        channel,
        markdown_text: markdown,
      });
      if (sent.ok || needsExportAuth(sent.error)) return sent;

      const listed = await executeTool(session, "SLACK_LIST_ALL_CHANNELS", {
        limit: 20,
        types: "public_channel",
        exclude_archived: true,
      });
      const fallback = findId(listed.data);
      if (fallback && fallback !== channel) {
        return executeTool(session, "SLACK_SEND_MESSAGE", {
          channel: fallback,
          markdown_text: markdown,
        });
      }
      return {
        ok: false,
        error:
          sent.error ||
          "Slack connected, but there is no channel I can post to. Pass a channel name or id.",
      };
    }

    let parent = pickId(input.parent?.trim() || "") || input.parent?.trim() || "";
    if (!parent) {
      const named = await executeTool(session, "NOTION_SEARCH_NOTION_PAGE", {
        query: "Dissent",
        filter_value: "page",
        page_size: 5,
      });
      parent = findId(named.data) ?? "";
    }
    if (!parent) {
      const any = await executeTool(session, "NOTION_SEARCH_NOTION_PAGE", {
        query: "",
        filter_value: "page",
        page_size: 5,
      });
      parent = findId(any.data) ?? "";
    }
    if (!parent) {
      return {
        ok: false,
        error:
          "Notion needs a parent page. In Notion, share a page with the integration, then try again.",
      };
    }

    return executeTool(session, "NOTION_CREATE_NOTION_PAGE", {
      title: input.title.slice(0, 120),
      parent_id: parent,
      markdown: input.markdown.slice(0, 20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The export did not complete.";
    return { ok: false, error: message };
  }
}
