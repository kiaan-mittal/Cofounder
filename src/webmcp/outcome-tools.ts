"use client";

import { detectPatterns } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { useArena } from "@/lib/store";
import type { Outcome } from "@/lib/types";
import { type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

/**
 * Outcome tools — closing the loop.
 *
 * Recording what actually happened is what separates this from a debate club.
 * Both tools here recompute the founder's calibration patterns, which are then
 * read back into the next decision by `get_founder_track_record`. That cycle is
 * the product.
 */

function state() {
  return useArena.getState();
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function refreshPatterns() {
  const s = useArena.getState();
  if (!s.company) return [];
  const patterns = detectPatterns(s.company.id, s.predictions, s.decisions);
  s.setPatterns(patterns);
  return patterns;
}

export const outcomeTools: ArenaTool[] = [
  {
    name: "evaluate_prediction",
    group: "outcome",
    humanLabel: "Record what actually happened",
    description:
      "Records the real number against a prediction and scores it: within 10 percent counts as a hit, within 35 percent as partial, otherwise a miss. Recomputes the founder's calibration profile immediately. Returns the score, the ratio, and the patterns that changed.",
    inputSchema: {
      type: "object",
      properties: {
        prediction_id: {
          type: "string",
          description:
            "The prediction id, as returned by get_founder_track_record.",
        },
        actual_value: {
          type: "number",
          description: "The number that actually happened, in the prediction's unit.",
        },
      },
      required: ["prediction_id", "actual_value"],
      additionalProperties: false,
    },
    execute: (args) => {
      const predictionId = str(args.prediction_id);
      const actual = args.actual_value;
      if (typeof actual !== "number" || !Number.isFinite(actual)) {
        return toolError("actual_value must be a number.");
      }

      const updated = state().recordActual(predictionId, actual);
      if (!updated) {
        return toolError(
          `No prediction with id "${predictionId}". Call get_founder_track_record for valid ids.`,
        );
      }

      const patterns = refreshPatterns();

      return toolResult(
        `Predicted ${updated.expectedValue} ${updated.unit}, actual ${actual} — ${updated.status}. Calibration updated.`,
        {
          predictionId: updated.id,
          expected: updated.expectedValue,
          actual,
          status: updated.status,
          ratio: updated.ratio,
          patterns: patterns.map((p) => p.insight),
        },
      );
    },
  },

  {
    name: "record_outcome",
    group: "outcome",
    humanLabel: "Record a decision outcome",
    description:
      "Records how a committed decision turned out, along with the one lesson worth carrying forward. The lesson is surfaced again during future decisions on similar questions. Returns the stored outcome.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        decision_id: {
          type: "string",
          description: "The decision id, as returned by get_decision_history.",
        },
        result: {
          type: "string",
          enum: ["succeeded", "failed", "mixed", "too_early"],
          description: "How the decision turned out in reality.",
        },
        summary: {
          type: "string",
          description: "What actually happened, in about two sentences.",
        },
        lesson: {
          type: "string",
          description:
            "The transferable lesson: what would have to be true next time.",
        },
      },
      required: ["decision_id", "result", "summary", "lesson"],
      additionalProperties: false,
    },
    execute: (args) => {
      const s = state();
      const decisionId = str(args.decision_id);
      const decision = s.decisions.find((d) => d.id === decisionId);
      if (!decision) {
        return toolError(
          `No decision with id "${decisionId}". Call get_decision_history for valid ids.`,
        );
      }

      const result = args.result;
      const outcome: Outcome = {
        id: id("out"),
        decisionId: decision.id,
        result:
          result === "succeeded" ||
          result === "failed" ||
          result === "mixed" ||
          result === "too_early"
            ? result
            : "mixed",
        summary: str(args.summary),
        lesson: str(args.lesson),
        recordedAt: now(),
      };

      s.addOutcome(outcome);
      const patterns = refreshPatterns();

      return toolResult(
        `Outcome recorded for "${decision.question}": ${outcome.result}.`,
        {
          outcomeId: outcome.id,
          lesson: outcome.lesson,
          patterns: patterns.map((p) => p.insight),
        },
      );
    },
  },
];
