"use client";

import { boardTools } from "@/webmcp/board-tools";
import { contextTools } from "@/webmcp/context-tools";
import { debateTools } from "@/webmcp/debate-tools";
import { decisionTools } from "@/webmcp/decision-tools";
import { outcomeTools } from "@/webmcp/outcome-tools";
import { shareTools } from "@/webmcp/share-tools";
import type { ArenaTool } from "@/webmcp/registry";

/**
 * The Dissent tool surface.
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

/** One-line human copy for /webmcp. Agent-facing descriptions stay long. */
export const TOOL_SUMMARIES: Record<string, string> = {
  the_room: "Company and open decision, already in this room.",
  get_company_brain: "Opens Brain. What the company builds, facts vs bets.",
  get_current_decision: "Structured dissenters plus the floor verdict.",
  get_decision_history: "Opens History. Past decisions, newest first.",
  get_founder_track_record: "Opens Calibration. How this founder has missed.",
  add_argument: "A structured dissenter claim: position, strength, risk, undo.",
  request_evidence: "A checkable ask. Blocks commit until answered.",
  flag_contradiction: "Two things that cannot both be true.",
  add_risk: "Severity and likelihood. Stays open until resolved.",
  add_defense: "The founder's pushback, on the record.",
  stress_test_decision: "Creates the floor, seats five dissenters, returns the verdict.",
  create_prediction: "One number, a unit, a deadline.",
  commit_decision: "Proposes a commit. Does not commit.",
  confirm_commit: "Founder only. Agents are refused.",
  share_decision: "Public link. Optionally Slack or Notion.",
  evaluate_prediction: "Score a number against what actually happened.",
  record_outcome: "What reality did. Recalibrates the profile.",
};

export function toolSummary(tool: Pick<ArenaTool, "name" | "humanLabel">) {
  return TOOL_SUMMARIES[tool.name] ?? tool.humanLabel;
}

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
