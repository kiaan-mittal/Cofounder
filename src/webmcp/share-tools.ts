"use client";

import { post } from "@/lib/api";
import { briefFromState } from "@/lib/decision-brief";
import { activeDecision } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

function state() {
  return useArena.getState();
}

function resolveDecision(decisionId?: unknown) {
  const s = state();
  if (typeof decisionId === "string" && decisionId) {
    return s.decisions.find((item) => item.id === decisionId) ?? null;
  }
  return activeDecision(s);
}

export const shareTools: ArenaTool[] = [
  {
    name: "share_decision",
    group: "action",
    humanLabel: "Share a decision link",
    description:
      "Create a public, read-only link to the decision record on the table — seats, verdict, contradictions, outstanding evidence. The founder can send it to anyone. You do not need them to click Copy. Returns the URL. Prefer this when they say share, send a link, or 'give this to my team'. Then they can open it without signing in.",
    inputSchema: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
    },
    execute: async (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) {
        return toolError("There is no decision open to share.");
      }
      const brief = briefFromState(state(), decision.id);
      if (!brief) return toolError("There is no decision open to share.");
      try {
        const created = await post<{ url: string; token: string }>("/api/share", {
          brief,
          decisionId: decision.id,
        });
        return toolResult(`Share link: ${created.url}`, created);
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : "Could not create a share link.",
        );
      }
    },
  },
  {
    name: "export_decision",
    group: "action",
    humanLabel: "Export a decision",
    description:
      "Send the decision record out of the Arena: a public link, a Slack message, or a Notion page. Always creates the share link first so the team can open the live record. For Slack, pass channel (name or id, default general). For Notion, pass parent as a page title or id if you have one. If Slack or Notion is not connected, the result includes connectUrl — tell the founder to open it, then call this again. You cannot confirm_commit.",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: ["link", "slack", "notion"],
          description: "link, slack, or notion.",
        },
        channel: {
          type: "string",
          description: "Slack channel name or id. Defaults to general.",
        },
        parent: {
          type: "string",
          description: "Notion parent page title or id.",
        },
        decision_id: { type: "string" },
      },
      required: ["destination"],
    },
    execute: async (args) => {
      const destination = String(args.destination ?? "");
      if (destination !== "link" && destination !== "slack" && destination !== "notion") {
        return toolError('destination must be "link", "slack", or "notion".');
      }
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open to export.");
      const brief = briefFromState(state(), decision.id);
      if (!brief) return toolError("There is no decision open to export.");
      try {
        const result = await post<{
          url: string;
          token: string;
          exported?: string;
          needsConnect?: boolean;
          connectUrl?: string;
          error?: string;
        }>("/api/export", {
          destination,
          brief,
          decisionId: decision.id,
          channel: typeof args.channel === "string" ? args.channel : undefined,
          parent: typeof args.parent === "string" ? args.parent : undefined,
          returnTo: "/arena",
        });
        if (result.needsConnect && result.connectUrl) {
          return toolResult(
            `Share link is ready: ${result.url}. ${destination} is not connected yet. Ask the founder to open this connect URL, then call export_decision again: ${result.connectUrl}`,
            result,
          );
        }
        return toolResult(
          destination === "link"
            ? `Share link: ${result.url}`
            : `Exported to ${destination}. Live record: ${result.url}`,
          result,
        );
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : "Could not export this decision.",
        );
      }
    },
  },
];
