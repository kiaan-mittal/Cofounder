"use client";

import { calibrationWarning } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { activeDecision, readiness } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Prediction, PredictionDomain } from "@/lib/types";
import { currentChannel, actorFromChannel, type ArenaTool } from "@/webmcp/registry";
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

function resolveDecision(decisionId?: unknown) {
  const s = state();
  if (typeof decisionId === "string" && decisionId) {
    return s.decisions.find((d) => d.id === decisionId) ?? null;
  }
  return activeDecision(s);
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
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
      required: ["statement", "metric", "expected_value", "unit"],
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
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
        createdBy: actorFromChannel(),
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
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
      required: ["text"],
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
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
        createdBy: actorFromChannel(),
        createdAt: now(),
      });
      spotlight(actionId);

      return toolResult(`Action item added: ${text}`, { actionItemId: actionId });
    },
  },

  {
    name: "toggle_action_item",
    group: "action",
    humanLabel: "Toggle an action item",
    description:
      "Mark an action item done, or reopen it. Use the action item id from get_current_decision.",
    inputSchema: {
      type: "object",
      properties: {
        action_item_id: {
          type: "string",
          description: "From get_current_decision, e.g. act_…",
        },
      },
      required: ["action_item_id"],
    },
    execute: (args) => {
      const actionId = str(args.action_item_id);
      const target = state().actionItems.find((a) => a.id === actionId);
      if (!target) {
        return toolError(
          `No action item with id "${actionId}". Call get_current_decision for valid ids.`,
        );
      }
      state().toggleActionItem(actionId);
      spotlight(actionId);
      const done = !target.done;
      return toolResult(
        done ? `Action item done: ${target.text}` : `Action item reopened: ${target.text}`,
        { actionItemId: actionId, done },
      );
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
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
      required: ["option", "rationale"],
    },
    execute: (args) => {
      const s = state();
      const decision = resolveDecision(args.decision_id);
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

  {
    name: "open_decision",
    group: "action",
    humanLabel: "Open a decision",
    description:
      "Create a decision on the table, or fill an existing one, and make it the round the founder has open. Pass options the seats will argue over. Then write arguments with add_argument. Returns the decision id.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The decision, as a question." },
        context: { type: "string", description: "What is at stake, in their words." },
        options: {
          type: "array",
          description: "Mutually exclusive choices, each { label, detail }.",
        },
        arena_confidence: {
          type: "number",
          description: "0-100. How confident the Arena is. Defaults to 50.",
        },
        decision_id: {
          type: "string",
          description: "Reuse an existing decision instead of creating one.",
        },
      },
      required: ["question"],
    },
    execute: (args) => {
      const s = state();
      if (!s.company) {
        return toolError("Build a Company Brain before opening a decision.");
      }
      const question = str(args.question);
      if (!question) return toolError("A decision needs a question.");
      const rawOptions = Array.isArray(args.options) ? args.options : [];
      const options = rawOptions
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        )
        .map((item) => ({
          id: id("opt"),
          label: str(item.label, "Option"),
          detail: str(item.detail),
        }));
      const existingId = str(args.decision_id);
      const existing = existingId
        ? s.decisions.find((d) => d.id === existingId)
        : undefined;
      const decision =
        existing ??
        s.createDecision({
          question,
          context: str(args.context),
          options,
        });
      s.updateDecision(decision.id, {
        agentConfidence: Math.max(
          0,
          Math.min(100, Math.round(num(args.arena_confidence, 50))),
        ),
        round: Math.max(1, decision.round),
        status: "open",
        ...(existing && existing.options.length === 0 && options.length
          ? { options }
          : {}),
      });
      s.setActiveDecision(decision.id);
      if (!existing && s.company) {
        s.adoptBoardMarks(s.company.id, decision.id);
        s.adoptCanvas(s.company.id, decision.id);
      }
      spotlight(decision.id);
      return toolResult(`Opened: ${question}`, { decisionId: decision.id });
    },
  },

  {
    name: "set_active_decision",
    group: "action",
    humanLabel: "Switch the open arena",
    description:
      "Put a past or current decision in front of the founder, or pass list=true to show the gallery of arenas. Use get_decision_history for ids.",
    inputSchema: {
      type: "object",
      properties: {
        decision_id: { type: "string" },
        list: {
          type: "boolean",
          description: "Leave the round and show every arena.",
        },
      },
    },
    execute: (args) => {
      const s = state();
      if (args.list === true || !str(args.decision_id)) {
        s.setActiveDecision(null);
        return toolResult("Showing the arena list.", { decisionId: null });
      }
      const decisionId = str(args.decision_id);
      const found = s.decisions.find((d) => d.id === decisionId);
      if (!found) {
        return toolError(
          `No decision with id "${decisionId}". Call get_decision_history.`,
        );
      }
      s.setActiveDecision(found.id);
      spotlight(found.id);
      return toolResult(`Opened “${found.question}”.`, { decisionId: found.id });
    },
  },

  {
    name: "set_confidence",
    group: "action",
    humanLabel: "Set confidence",
    description:
      "Set the founder's confidence, the Arena's, or both (0-100) on a decision.",
    inputSchema: {
      type: "object",
      properties: {
        founder: { type: "number" },
        arena: { type: "number" },
        decision_id: { type: "string" },
      },
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open in the Arena.");
      const patch: { founderConfidence?: number; agentConfidence?: number } = {};
      if (typeof args.founder === "number" && Number.isFinite(args.founder)) {
        patch.founderConfidence = Math.max(0, Math.min(100, Math.round(args.founder)));
      }
      if (typeof args.arena === "number" && Number.isFinite(args.arena)) {
        patch.agentConfidence = Math.max(0, Math.min(100, Math.round(args.arena)));
      }
      if (!Object.keys(patch).length) {
        return toolError("Pass founder and/or arena as a number 0-100.");
      }
      state().updateDecision(decision.id, patch);
      return toolResult("Confidence updated.", {
        decisionId: decision.id,
        ...patch,
      });
    },
  },

  {
    name: "confirm_commit",
    group: "action",
    humanLabel: "Confirm a commitment",
    description:
      "Commit the open decision. Only the founder can call this — agents must use commit_decision to propose. Uses a staged proposal if one exists, otherwise option and rationale.",
    annotations: { destructiveHint: true },
    inputSchema: {
      type: "object",
      properties: {
        option: { type: "string" },
        rationale: { type: "string" },
        decision_id: { type: "string" },
      },
    },
    execute: (args) => {
      if (currentChannel() !== "founder") {
        return toolError(
          "Only the founder can confirm a commitment. Call commit_decision to stage one for them.",
        );
      }
      const s = state();
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open in the Arena.");
      if (decision.status === "committed") {
        return toolError("This decision is already committed.");
      }
      const pending =
        s.pendingCommit?.decisionId === decision.id ? s.pendingCommit : null;
      const wanted = str(args.option, pending?.optionLabel ?? "").toLowerCase();
      const option =
        (pending
          ? decision.options.find((o) => o.id === pending.optionId)
          : undefined) ??
        decision.options.find((o) => o.id.toLowerCase() === wanted) ??
        decision.options.find((o) => o.label.toLowerCase() === wanted) ??
        decision.options.find((o) => o.label.toLowerCase().includes(wanted));
      if (!option) {
        return toolError("Pick an option from get_current_decision.");
      }
      s.updateDecision(decision.id, {
        status: "committed",
        chosenOptionId: option.id,
        commitmentRationale: str(args.rationale, pending?.rationale ?? ""),
        committedAt: now(),
      });
      s.proposeCommit(null);
      spotlight(decision.id);
      return toolResult(`Committed to “${option.label}”.`, {
        decisionId: decision.id,
        optionId: option.id,
      });
    },
  },

  {
    name: "set_decision_status",
    group: "action",
    humanLabel: "Investigate or abandon",
    description:
      "Mark the decision investigating (deferral on the record) or abandoned. open puts it back on the floor. Committing uses confirm_commit.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "investigating", "abandoned"],
        },
        decision_id: { type: "string" },
      },
      required: ["status"],
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open in the Arena.");
      const status = args.status;
      if (
        status !== "open" &&
        status !== "investigating" &&
        status !== "abandoned"
      ) {
        return toolError('status must be "open", "investigating", or "abandoned".');
      }
      state().updateDecision(decision.id, { status });
      spotlight(decision.id);
      return toolResult(`Decision is now ${status}.`, {
        decisionId: decision.id,
        status,
      });
    },
  },
];
