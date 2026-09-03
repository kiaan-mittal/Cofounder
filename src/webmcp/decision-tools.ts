"use client";

import { calibrationWarning } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import {
  OpeningPaintError,
  paintOpeningRound,
  verdictFor,
} from "@/lib/paint-opening";
import { activeDecision, readiness } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Decision, Prediction, PredictionDomain } from "@/lib/types";
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

/** Latest activity on a decision: when it was committed, else when it was opened. */
function touchedAt(decision: Decision) {
  return Date.parse(decision.committedAt ?? decision.createdAt) || 0;
}

function mostRecentDecision(decisions: Decision[]) {
  return decisions.reduce<Decision | null>(
    (latest, decision) =>
      !latest || touchedAt(decision) > touchedAt(latest) ? decision : latest,
    null,
  );
}

function normQuestion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ");
}

function questionsAlign(left: string, right: string) {
  const a = normQuestion(left);
  const b = normQuestion(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function seatCount(decisionId: string) {
  return state().argumentList.filter(
    (item) => item.decisionId === decisionId && !item.challengesId,
  ).length;
}

/**
 * Reuse the live open floor instead of spawning a second arena when ChatGPT
 * calls stress_test_decision / open_decision with the same question.
 */
function reusableOpenDecision(question: string): Decision | undefined {
  const s = state();
  const open = s.decisions.filter((item) => item.status === "open");
  const exact = open.find((item) => questionsAlign(item.question, question));
  if (exact) return exact;

  const active = s.activeDecisionId
    ? s.decisions.find(
        (item) => item.id === s.activeDecisionId && item.status === "open",
      )
    : undefined;
  if (active && (questionsAlign(active.question, question) || seatCount(active.id) === 0)) {
    return active;
  }

  const live = open.find((item) => item.id === "dec_it_live");
  if (live && seatCount(live.id) === 0) return live;
  if (open.length === 1 && seatCount(open[0].id) === 0) return open[0];
  return undefined;
}

export const decisionTools: ArenaTool[] = [
  {
    name: "stress_test_decision",
    group: "action",
    humanLabel: "Stress-test a decision",
    description:
      "Creates the floor if none is open, or fills the live empty question, then seats five dissenters: Technical, Product, GTM, Finance and Contrarian. Each writes a structured claim (position, strength, claim, evidence, risk, reversibility). Wait until they finish (about 30 seconds). Returns the decision id, every seat's claim, FOR/AGAINST split, dimension scores, flip conditions, next move, open contradictions and outstanding evidence.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "The decision as a question, for example 'Should I spend the launch budget this month?'",
        },
        context: {
          type: "string",
          description:
            "What is at stake in the founder's words: runway, a date, a number they already have.",
        },
        decision_id: {
          type: "string",
          description:
            "An existing empty decision to fill instead of creating a new one.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const question = str(args.question);
      if (question.length < 8) {
        return toolError(
          "Pass a real decision as `question`, e.g. 'Should I spend the launch budget this month?'",
        );
      }
      try {
        const painted = await paintOpeningRound({
          question,
          founderContext: str(args.context),
          existingDecisionId: str(args.decision_id) || undefined,
        });
        const verdict = verdictFor(painted.decisionId);
        const seats = painted.round.arguments.map((item) => ({
          seat: item.perspective,
          position: item.stance,
          strength: item.strength,
          claim: item.claim,
          evidence: item.basis[0]?.label ?? null,
          risk: item.riskLevel,
          reversibility: item.reversibility,
        }));
        const forPct = verdict?.forPct ?? 50;
        const againstPct = verdict?.againstPct ?? 50;
        return toolResult(
          verdict?.deadlock
            ? `Floor opened. Deadlock: ${verdict.deadlockNote}`
            : `Floor opened on “${question}”. Verdict: ${verdict?.verdictLabel ?? "too early"} (${verdict?.arenaConfidence ?? 0}%). FOR ${forPct} / AGAINST ${againstPct}. ${seats.length} dissenters have written.`,
          {
            decisionId: painted.decisionId,
            options: painted.round.options,
            seats,
            contradictions: painted.round.contradictions,
            evidenceRequests: painted.round.evidenceRequests,
            verdict,
          },
        );
      } catch (caught) {
        if (caught instanceof OpeningPaintError) {
          return toolError(
            caught.hint ? `${caught.message} ${caught.hint}` : caught.message,
          );
        }
        return toolError(
          caught instanceof Error
            ? caught.message
            : "Dissent could not open this round.",
        );
      }
    },
  },

  {
    name: "create_prediction",
    group: "action",
    humanLabel: "Create a prediction",
    description:
      "Records a falsifiable prediction against the decision: one number, a unit and a deadline, so reality can judge it later. Where the founder's calibration history shows they overestimate this domain, the response also carries the history-adjusted figure. Returns the prediction id.",
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
        decision_id: {
          type: "string",
          description:
            "Which decision this belongs to. Defaults to the decision the founder has open.",
        },
      },
      required: ["statement", "metric", "expected_value", "unit"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

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
    expose: false,
    humanLabel: "Add an action item",
    description:
      "Attaches a concrete next step to the decision, typically the cheapest thing that would resolve an open risk or answer an outstanding evidence request. Returns the action item id.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "The action phrased as something to do, sized to finish in about a week.",
        },
        owner: {
          type: "string",
          description: "Who does it. Defaults to the founder.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to attach it to. Defaults to the decision the founder has open.",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

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
    expose: false,
    humanLabel: "Toggle an action item",
    description:
      "Marks an action item done, or reopens one that was already done. Returns the item id and its new state.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        action_item_id: {
          type: "string",
          description:
            "The action item id, as returned by get_current_decision, for example act_4f2a.",
        },
      },
      required: ["action_item_id"],
      additionalProperties: false,
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
      "Stages a commitment to one of the decision's options, with a rationale, for the founder to confirm on the floor itself. It does not commit the decision: confirming is irreversible and stays with the person who lives with it. Returns the staged option and anything still blocking it, such as unresolved contradictions or outstanding evidence requests.",
    annotations: { untrustedContentHint: true },
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
          description: "Why this option, given where the debate landed.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to stage. Defaults to the decision the founder has open.",
        },
      },
      required: ["option", "rationale"],
      additionalProperties: false,
    },
    execute: (args) => {
      const s = state();
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
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
    expose: false,
    humanLabel: "Open a decision",
    description:
      "Creates a blank decision with its options, or fills an existing empty one, and makes it the round the founder has open. It seats no perspectives and writes no arguments, unlike stress_test_decision, which does both. Returns the decision id.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The decision, phrased as a question.",
        },
        context: {
          type: "string",
          description: "What is at stake, in the founder's words.",
        },
        options: {
          type: "array",
          description:
            "The mutually exclusive choices, each an object with a label and a detail.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Short name for the option." },
              detail: { type: "string", description: "What taking it means." },
            },
            required: ["label"],
          },
        },
        arena_confidence: {
          type: "number",
          description:
            "How confident the floor is, 0-100. Defaults to 50.",
        },
        decision_id: {
          type: "string",
          description:
            "An existing decision to fill instead of creating a new one.",
        },
      },
      required: ["question"],
      additionalProperties: false,
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
        : reusableOpenDecision(question);
      const context = str(args.context);
      const decision =
        existing ??
        s.createDecision({
          question,
          context,
          options,
        });
      const emptySeats = existing ? seatCount(existing.id) === 0 : true;
      s.updateDecision(decision.id, {
        agentConfidence: Math.max(
          0,
          Math.min(100, Math.round(num(args.arena_confidence, 50))),
        ),
        round: Math.max(1, decision.round),
        status: "open",
        ...(existing && emptySeats ? { question } : {}),
        ...(existing && emptySeats && context ? { context } : {}),
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
    name: "write_decision_summary",
    group: "action",
    expose: false,
    humanLabel: "Write the decision summary",
    description:
      "Writes the short framing paragraph that sits at the top of a decision record, above the seat arguments, summarising what is at stake. It replaces whatever summary is there unless append is true, and the seats read it on the next round. Returns the stored summary.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "The paragraph to place at the top: what is at stake, in a few sentences.",
        },
        append: {
          type: "boolean",
          description:
            "Add to the summary already there instead of replacing it. Defaults to false.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to write on. Defaults to the decision the founder has open.",
        },
      },
      required: ["summary"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

      const summary = str(args.summary);
      if (!summary) return toolError("A summary needs text.");

      const next =
        args.append === true && decision.context
          ? `${decision.context}\n\n${summary}`
          : summary;

      state().updateDecision(decision.id, { context: next });
      spotlight(decision.id);

      return toolResult(`Summary written on “${decision.question}”.`, {
        decisionId: decision.id,
        summary: next,
      });
    },
  },

  {
    name: "open_saved_decision",
    group: "action",
    expose: false,
    humanLabel: "Open a saved decision",
    description:
      "Opens a decision the founder already has and puts it back in front of them on the floor. With most_recent true it opens the one they worked on last; with a decision_id it opens that one; with list true it leaves the round and shows the gallery of every arena. Returns the decision that is now open.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        most_recent: {
          type: "boolean",
          description:
            "Open the decision the founder worked on most recently, without needing its id.",
        },
        decision_id: {
          type: "string",
          description:
            "The id of a specific decision to open, as returned by get_decision_history.",
        },
        list: {
          type: "boolean",
          description:
            "Leave the current round and show the gallery of every arena instead.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: (args) => {
      const s = state();
      if (args.list === true) {
        s.setActiveDecision(null);
        return toolResult("Showing the arena list.", { decisionId: null });
      }

      const decisionId = str(args.decision_id);
      let found = decisionId
        ? (s.decisions.find((d) => d.id === decisionId) ?? null)
        : null;

      if (decisionId && !found) {
        return toolError(
          `No decision with id "${decisionId}". get_decision_history lists the valid ids.`,
        );
      }

      if (!found) {
        found = mostRecentDecision(s.decisions);
      }

      if (!found) {
        return toolResult("There are no saved decisions to open.", {
          decisionId: null,
          note: "This founder has not run an arena yet.",
        });
      }

      s.setActiveDecision(found.id);
      spotlight(found.id);
      return toolResult(`Opened “${found.question}”.`, {
        decisionId: found.id,
        question: found.question,
        status: found.status,
      });
    },
  },

  {
    name: "set_confidence",
    group: "action",
    expose: false,
    humanLabel: "Set confidence",
    description:
      "Sets the founder's confidence, the floor's, or both, as a number from 0 to 100 on a decision. Returns the values now stored.",
    inputSchema: {
      type: "object",
      properties: {
        founder: {
          type: "number",
          description: "The founder's confidence in the decision, 0-100.",
        },
        arena: {
          type: "number",
          description: "The floor's confidence in the decision, 0-100.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to update. Defaults to the decision the founder has open.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
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
      "Commits a decision to one option and writes it to the permanent record, which cannot be undone. It uses the proposal staged by commit_decision when one exists, otherwise the option and rationale passed here. Only the founder's own controls complete it — human-in-the-loop. ChatGPT can propose; the founder confirms.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        option: {
          type: "string",
          description:
            "The option id or exact label to commit to. Defaults to the staged proposal.",
        },
        rationale: {
          type: "string",
          description:
            "Why this option. Defaults to the rationale on the staged proposal.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to commit. Defaults to the decision the founder has open.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: (args) => {
      if (currentChannel() !== "founder") {
        const decision = resolveDecision(args.decision_id);
        if (decision && decision.status !== "committed") {
          state().updateDecision(decision.id, {
            agentCommitRefusedAt: now(),
            agentCommitRefusedCount: (decision.agentCommitRefusedCount ?? 0) + 1,
          });
        }
        return toolError(
          "confirm_commit needs the founder's confirmation. ChatGPT can propose with commit_decision; the founder closes it here.",
        );
      }
      const s = state();
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
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
    expose: false,
    humanLabel: "Investigate or abandon",
    description:
      "Marks a decision investigating, which puts a deferral on the record, or abandoned, or open to put it back on the floor. Committing is not one of these states; that goes through confirm_commit. Returns the new status.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "investigating", "abandoned"],
          description:
            "open puts it back on the floor, investigating records a deferral, abandoned closes it unchosen.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to update. Defaults to the decision the founder has open.",
        },
      },
      required: ["status"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
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
