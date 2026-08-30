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
 * Every tool here is a decision primitive, not a UI control. There is no
 * `click_commit_button` or `scroll_to_risks`; there is `challenge_argument`,
 * `flag_contradiction` and `create_prediction`. The page decides how a
 * semantic action is rendered, which is what keeps the agent a participant in
 * the workspace rather than a puppeteer of its buttons.
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
