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

/**
 * One tool, not two. `export_decision(destination: "link")` was byte-for-byte
 * `share_decision`: both created the same public record through the same
 * endpoint, so an agent asked to "share this" had two correct answers and no
 * way to choose. Sending to Slack or Notion is the same act with a further
 * delivery step, which is what `destination` now expresses.
 */
export const shareTools: ArenaTool[] = [
  {
    name: "share_decision",
    group: "action",
    humanLabel: "Share a decision link",
    description:
      "Creates a public read-only page for one decision record — the seat arguments, the verdict, open contradictions and outstanding evidence — and returns its URL and token. Anyone holding the link can read it without signing in. If an agent was refused on confirm_commit, that refusal is printed on the page and the Slack/Notion unfurl. Destination \"slack\" also posts it into the founder's connected Slack channel and \"notion\" also creates a page in their connected Notion workspace; either returns a connectUrl and sends nothing when that workspace is not connected yet.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: ["link", "slack", "notion"],
          description:
            "Where the record goes: a link only, a Slack message, or a Notion page. Defaults to link.",
        },
        channel: {
          type: "string",
          description:
            "Slack channel name or id, when destination is slack. Defaults to general.",
        },
        parent: {
          type: "string",
          description:
            "Notion parent page title or id to create the page under, when destination is notion.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to publish. Defaults to the decision the founder has open.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: async (args) => {
      const requested = args.destination ?? "link";
      if (
        requested !== "link" &&
        requested !== "slack" &&
        requested !== "notion"
      ) {
        return toolError('destination must be "link", "slack", or "notion".');
      }
      const destination = requested;

      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open to share.");
      const brief = briefFromState(state(), decision.id);
      if (!brief) return toolError("There is no decision open to share.");

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
            `Share link is ready: ${result.url}. Nothing was sent because ${destination} is not connected. Connect URL: ${result.connectUrl}`,
            result,
          );
        }
        return toolResult(
          destination === "link"
            ? brief.commitRefused
              ? `Share link: ${result.url}. The card says confirm_commit was refused.`
              : `Share link: ${result.url}`
            : brief.commitRefused
              ? `Shared to ${destination}. Live record: ${result.url}. The card says confirm_commit was refused.`
              : `Shared to ${destination}. Live record: ${result.url}`,
          result,
        );
      } catch (error) {
        return toolError(
          error instanceof Error
            ? error.message
            : "Could not create a share link.",
        );
      }
    },
  },
];
