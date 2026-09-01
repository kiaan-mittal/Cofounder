import "server-only";

import { getComposio } from "@/server/composio";

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

export async function startExportConnect(
  userId: string,
  toolkit: ExportToolkit,
  callbackUrl: string,
) {
  const session = await getComposio().create(userId, {
    toolkits: [toolkit],
  });
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
    const session = await getComposio().create(userId);
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

function executeOk(result: unknown): { ok: boolean; error?: string; data: unknown } {
  const record = asRecord(result);
  const error =
    typeof record.error === "string"
      ? record.error
      : typeof record.message === "string"
        ? record.message
        : undefined;
  if (record.successful === false) {
    return { ok: false, error: error || "The export did not complete.", data: record.data };
  }
  if (error && needsExportAuth(error)) {
    return { ok: false, error, data: record.data };
  }
  return { ok: true, data: record.data ?? result };
}

async function executeTool(
  session: { execute: (slug: string, args: Record<string, unknown>) => Promise<unknown> },
  slug: string,
  args: Record<string, unknown>,
) {
  try {
    return executeOk(await session.execute(slug, args));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message, data: null };
  }
}

function firstId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 8) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstId(item);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  for (const key of ["id", "page_id", "parent_id", "channel", "channel_id"]) {
    const hit = record[key];
    if (typeof hit === "string" && hit.length > 8) return hit;
  }
  for (const nested of ["data", "results", "items", "pages", "channels"]) {
    const found = firstId(record[nested]);
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
  const session = await getComposio().create(input.userId, {
    toolkits: [input.toolkit],
  });

  if (input.toolkit === "slack") {
    const channel = input.channel?.replace(/^#/, "").trim() || "general";
    const sent = await executeTool(session, "SLACK_SEND_MESSAGE", {
      channel,
      markdown_text: input.markdown.slice(0, 3900),
    });
    if (sent.ok || needsExportAuth(sent.error)) return sent;
    const listed = await executeTool(session, "SLACK_LIST_ALL_CHANNELS", {
      limit: 20,
    });
    const fallback = firstId(listed.data);
    if (fallback && fallback !== channel) {
      return executeTool(session, "SLACK_SEND_MESSAGE", {
        channel: fallback,
        markdown_text: input.markdown.slice(0, 3900),
      });
    }
    return sent;
  }

  let parent = input.parent?.trim() || "";
  if (!parent) {
    const named = await executeTool(session, "NOTION_SEARCH_NOTION_PAGE", {
      query: "Decision Arena",
      filter_value: "page",
      page_size: 5,
    });
    parent = firstId(named.data) ?? "";
  }
  if (!parent) {
    const any = await executeTool(session, "NOTION_SEARCH_NOTION_PAGE", {
      query: "",
      filter_value: "page",
      page_size: 5,
    });
    parent = firstId(any.data) ?? "";
  }
  if (!parent) {
    return {
      ok: false,
      error:
        "Notion needs a parent page. Share a page with the integration, or pass parent as a page title or id.",
    };
  }

  return executeTool(session, "NOTION_CREATE_NOTION_PAGE", {
    title: input.title.slice(0, 120),
    parent_id: parent,
    markdown: input.markdown.slice(0, 20_000),
  });
}
