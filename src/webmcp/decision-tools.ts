"use client";

import { calibrationWarning } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { activeDecision, readiness } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Prediction, PredictionDomain } from "@/lib/types";
import { currentChannel, type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

/**
 * Action tools — turning the debate into commitments reality can judge.
 *
 * `commit_decision` deliberately does not commit. An agent can propose a
 * commitment, with its reasoning, and the Arena stages it for one-click
 * confirmation by the founder. WebMCP's own explainer is explicit that this is
 * a human-in-the-loop protocol, and committing is the single irreversible act
 * in this product, so the last click stays with the person who lives with it.
 */

const DOMAINS: PredictionDomain[] = [
  "growth",
  "revenue",
  "timeline",
  "technical",
  "retention",
  "distribution",
  "other",
];

function state() {
  return useArena.getState();
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function spotlight(targetId: string) {
  state().spotlight(targetId);
  setTimeout(() => {
    if (useArena.getState().spotlightId === targetId) {
      useArena.getState().spotlight(null);
    }
  }, 6000);
}

export const decisionTools: ArenaTool[] = [
  {
    name: "create_prediction",
    group: "action",
    humanLabel: "Create a prediction",
    description:
      "Turn the decision into something reality can judge: a single number, a unit and a deadline. Good predictions are falsifiable and near-term — '100 qualified signups within 30 days', not 'meaningful traction'. If the founder's calibration history shows they overestimate this domain, the response includes the history-adjusted figure so you can put it to them before they commit to the original number.",
    inputSchema: {
      type: "object",
      properties: {
        statement: {
          type: "string",
          description: "The prediction in plain words, e.g. '100 qualified users within 30 days'.",
        },
        metric: { type: "string", description: "What is being counted, e.g. 'qualified signups'." },
        expected_value: { type: "number", description: "The number the founder expects." },
        unit: { type: "string", description: "e.g. 'users', 'days', 'GBP'." },
        days: { type: "number", description: "Days until the deadline. Defaults to 30." },
        confidence: { type: "number", description: "0-100. The founder's confidence." },
        domain: {
          type: "string",
          enum: DOMAINS,
          description: "Which calibration domain this belongs to.",
        },
      },
      required: ["statement", "metric", "expected_value", "unit"],
    },
    execute: (args) => {
      const decision = activeDecision(state());
      if (!decision) return toolError("There is no decision open in the Arena.");

      const expectedValue = num(args.expected_value, NaN);
      if (!Number.isFinite(expectedValue)) {
        return toolError("A prediction needs a numeric expected_value.");
      }

      const days = Math.max(1, Math.round(num(args.days, 30)));
      const deadline = new Date(Date.now() + days * 86_400_000).toISOString();
      const domain = DOMAINS.includes(args.domain as PredictionDomain)
        ? (args.domain as PredictionDomain)
        : "other";

      const prediction: Prediction = {
        id: id("pred"),
        decisionId: decision.id,
        companyId: decision.companyId,
        statement: str(args.statement),
        domain,
        metric: str(args.metric, "outcome"),
        expectedValue,
        unit: str(args.unit, "units"),
        deadline,
        confidence: Math.max(0, Math.min(100, Math.round(num(args.confidence, 70)))),
        status: "pending",
        createdBy: "agent",
        channel: currentChannel(),
        createdAt: now(),
      };

      state().addPrediction(prediction);
      spotlight(prediction.id);

      const warning = calibrationWarning(domain, expectedValue, state().patterns);

      return toolResult(
        `Prediction recorded: ${prediction.statement}${
          warning
            ? ` — calibration warning: ${warning.insight} Adjusted for that history, the comparable figure is about ${warning.adjusted} ${prediction.unit}.`
            : ""
        }`,
        {
          predictionId: prediction.id,
          deadline,
          calibrationWarning: warning ?? null,
        },
      );
    },
  },

  {
    name: "add_action_item",
    group: "action",
    humanLabel: "Add an action item",
    description:
      "Attach a concrete next step to the decision — usually the cheapest thing that would resolve an open risk or answer an outstanding evidence request. Keep it to something completable in about a week.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The action, phrased as something to do." },
        owner: { type: "string", description: "Who does it. Defaults to the founder." },
      },
      required: ["text"],
    },
    execute: (args) => {
      const decision = activeDecision(state());
      if (!decision) return toolError("There is no decision open in the Arena.");

      const text = str(args.text);
      if (!text) return toolError("An action item needs text.");

      const actionId = id("act");
      state().addActionItem({
        id: actionId,
        decisionId: decision.id,
        text,
        owner: str(args.owner, "Founder"),
        done: false,
        createdBy: "agent",
        createdAt: now(),
      });
      spotlight(actionId);

      return toolResult(`Action item added: ${text}`, { actionItemId: actionId });
    },
  },

  {
    name: "commit_decision",
    group: "action",
    humanLabel: "Propose a commitment",
    description:
      "Propose that the founder commits to one of the decision's options, with your reasoning. This does NOT commit the decision — it stages the commitment in the Arena for the founder to confirm with one click, because committing is irreversible and belongs to the person who lives with it. The response tells you what is still blocking commitment, such as unresolved contradictions or outstanding evidence requests; address those first.",
    annotations: { destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        option: {
          type: "string",
          description:
            "The option id or its exact label, as returned by get_current_decision.",
        },
        rationale: {
          type: "string",
          description: "Why this option, given where the debate actually landed.",
        },
      },
      required: ["option", "rationale"],
    },
    execute: (args) => {
      const s = state();
      const decision = activeDecision(s);
      if (!decision) return toolError("There is no decision open in the Arena.");
      if (decision.status === "committed") {
        return toolError("This decision is already committed.");
      }

      const wanted = str(args.option).toLowerCase();
      const option =
        decision.options.find((o) => o.id.toLowerCase() === wanted) ??
        decision.options.find((o) => o.label.toLowerCase() === wanted) ??
        decision.options.find((o) => o.label.toLowerCase().includes(wanted));

      if (!option) {
        return toolError(
          `No option matching "${str(args.option)}". Options are: ${decision.options
            .map((o) => `${o.id} (${o.label})`)
            .join(", ")}.`,
        );
      }

      const blockers = readiness(s, decision.id).blockers;

      s.proposeCommit({
        decisionId: decision.id,
        optionId: option.id,
        optionLabel: option.label,
        rationale: str(args.rationale),
        proposedBy: currentChannel(),
        proposedAt: now(),
      });
      spotlight(decision.id);

      return toolResult(
        blockers.length
          ? `Commitment to "${option.label}" is staged for the founder's confirmation, but ${blockers.length} item(s) still block it.`
          : `Commitment to "${option.label}" is staged for the founder's confirmation.`,
        { option: option.label, blockers },
      );
    },
  },
];
