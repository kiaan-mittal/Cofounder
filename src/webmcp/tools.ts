"use client";

import { boardTools } from "@/webmcp/board-tools";
import { canvasTools } from "@/webmcp/canvas-tools";
import { contextTools } from "@/webmcp/context-tools";
import { debateTools } from "@/webmcp/debate-tools";
import { decisionTools } from "@/webmcp/decision-tools";
import { outcomeTools } from "@/webmcp/outcome-tools";
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
 *   action  — turn reasoning into commitment (predictions, proposals)
 *   outcome — feed reality back in           (results, calibration)
 */
export const ARENA_TOOLS: ArenaTool[] = [
  ...contextTools,
  ...boardTools,
  ...canvasTools,
  ...debateTools,
  ...decisionTools,
  ...outcomeTools,
];

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
    blurb: "Turn reasoning into commitments reality can judge.",
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
};
