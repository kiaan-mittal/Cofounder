"use client";

import { boardTools } from "@/webmcp/board-tools";
import { contextTools } from "@/webmcp/context-tools";
import { debateTools } from "@/webmcp/debate-tools";
import { decisionTools } from "@/webmcp/decision-tools";
import { outcomeTools } from "@/webmcp/outcome-tools";
import { shareTools } from "@/webmcp/share-tools";
import type { ArenaTool } from "@/webmcp/registry";

/**
 * The Decision Arena tool surface.
 *
 * Two layers, on purpose:
 *
 *   GUEST_TOOLS  — registered on document.modelContext. This is the protocol
 *                  a judge's agent sees: inherit the company, write on the
 *                  table, propose, do not finish, share the record.
 *   ARENA_TOOLS  — every implementation, including founder-only housekeeping
 *                  (open a saved round, tick an action item). Those stay
 *                  callable from the page so clicks still go through
 *                  executeTool. They are not advertised.
 *
 * Board marks stay as founder internals. There is no canvas tool surface —
 * the drawing on /arena is the same objects the table already holds.
 */

export const ARENA_TOOLS: ArenaTool[] = [
  ...contextTools,
  ...boardTools,
  ...debateTools,
  ...decisionTools,
  ...shareTools,
  ...outcomeTools,
];

/** What an agent discovers with getTools(). */
export const GUEST_TOOLS: ArenaTool[] = ARENA_TOOLS.filter(
  (tool) => tool.expose !== false,
);

export const TOOL_GROUPS = [
  {
    id: "context" as const,
    title: "Context",
    blurb: "Read the same structured workspace the founder is looking at.",
  },
  {
    id: "debate" as const,
    title: "Debate",
    blurb: "Write objects onto the table: arguments, contradictions, evidence.",
  },
  {
    id: "action" as const,
    title: "Action",
    blurb: "Seat the round, propose a commit, take the record with you.",
  },
  {
    id: "outcome" as const,
    title: "Outcome",
    blurb: "Record what happened and recalibrate the founder's profile.",
  },
];

export {
  boardTools,
  contextTools,
  debateTools,
  decisionTools,
  outcomeTools,
  shareTools,
};
