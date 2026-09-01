"use client";

import { boardTools } from "@/webmcp/board-tools";
import { canvasTools } from "@/webmcp/canvas-tools";
import { contextTools } from "@/webmcp/context-tools";
import { debateTools } from "@/webmcp/debate-tools";
import { decisionTools } from "@/webmcp/decision-tools";
import { outcomeTools } from "@/webmcp/outcome-tools";
import { shareTools } from "@/webmcp/share-tools";
import type { ArenaTool } from "@/webmcp/registry";

/**
 * The Decision Arena tool surface.
 *
 * Every durable write in the Arena — seats opening a round, the founder
 * defending, an external agent challenging — goes through these tools.
 * The page decides how a semantic action is rendered. There is no private
 * store API beside this surface.
 *
 *   context — understand the workspace       (read-only)
 *   debate  — participate in the reasoning   (writes and draws on the table)
 *   action  — commitments, then take the record with you
 *   outcome — feed reality back in           (results, calibration)
 */
/**
 * Registered on every page: the decision surface an agent needs wherever the
 * founder is standing.
 */
export const ARENA_TOOLS: ArenaTool[] = [
  ...contextTools,
  ...boardTools,
  ...debateTools,
  ...decisionTools,
  ...shareTools,
  ...outcomeTools,
];

/**
 * Registered only while /canvas is mounted. The canvas is the one surface
 * that exists on a single route, and a tool that cannot reach its target is
 * a broken contract, so these arm and disarm with the page.
 */
export const CANVAS_TOOLS: ArenaTool[] = canvasTools;

export const TOOL_GROUPS = [
  {
    id: "context" as const,
    title: "Context",
    blurb: "Read the same structured workspace the founder is looking at.",
  },
  {
    id: "debate" as const,
    title: "Debate",
    blurb: "Participate in the reasoning: argue, challenge, demand evidence.",
  },
  {
    id: "action" as const,
    title: "Action",
    blurb: "Turn reasoning into commitments, then take the record with you.",
  },
  {
    id: "outcome" as const,
    title: "Outcome",
    blurb: "Record what happened and recalibrate the founder's profile.",
  },
];

export {
  boardTools,
  canvasTools,
  contextTools,
  debateTools,
  decisionTools,
  outcomeTools,
  shareTools,
};
