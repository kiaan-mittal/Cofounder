"use client";

import { id, now } from "@/lib/id";
import { activeDecision } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Argument, PerspectiveId } from "@/lib/types";
import { currentChannel, type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

/**
 * Debate tools — how an agent participates in the reasoning rather than
 * narrating it.
 *
 * Every tool here writes a durable record into the decision the founder has
 * open. `challenge_argument` is the one that matters most: it does not delete
 * or overwrite the argument it targets, it attaches an opposing claim and
 * marks the original unresolved, because a decision record should preserve the
 * disagreement rather than resolve it silently.
 */

const PERSPECTIVE_VALUES: PerspectiveId[] = [
  "technical",
  "product",
  "gtm",
  "financial",
  "contrarian",
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

function asPerspective(value: unknown): PerspectiveId {
  return PERSPECTIVE_VALUES.includes(value as PerspectiveId)
    ? (value as PerspectiveId)
    : "contrarian";
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Draws the founder's eye to whatever the agent just changed. */
function spotlight(targetId: string) {
  state().spotlight(targetId);
  setTimeout(() => {
    if (useArena.getState().spotlightId === targetId) {
      useArena.getState().spotlight(null);
    }
  }, 6000);
}

export const debateTools: ArenaTool[] = [
  {
    name: "add_argument",
    group: "debate",
    humanLabel: "Add an argument",
    description:
      "Add a new argument to the open decision, attributed to one of the five Arena perspectives. Use this when you have found something the current round missed — grounded in the Company Brain or the founder's decision history, not in general startup advice. State the claim in one sentence and put the support in reasoning. Set strength honestly: an argument resting on an unverified assumption should not be a 90.",
    inputSchema: {
      type: "object",
      properties: {
        perspective: {
          type: "string",
          enum: PERSPECTIVE_VALUES,
          description: "Which seat is making this argument.",
        },
        stance: {
          type: "string",
          enum: ["for", "against", "conditional"],
          description: "For or against the founder's apparent preference.",
        },
        claim: { type: "string", description: "One sentence. The assertion itself." },
        reasoning: {
          type: "string",
          description: "Two to four sentences of company-specific support.",
        },
        basis: {
          type: "string",
          description:
            "A Company Brain fact or assumption id (fact_… / asm_…) or pattern id this rests on.",
        },
        strength: {
          type: "number",
          description: "0-100. How much weight this deserves. Defaults to 60.",
        },
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
      required: ["perspective", "stance", "claim", "reasoning"],
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open in the Arena.");

      const claim = str(args.claim);
      if (!claim) return toolError("An argument needs a claim.");

      const basisRef = str(args.basis);
      const argument: Argument = {
        id: id("arg"),
        decisionId: decision.id,
        perspective: asPerspective(args.perspective),
        stance:
          args.stance === "for" || args.stance === "conditional"
            ? args.stance
            : "against",
        claim,
        reasoning: str(args.reasoning, claim),
        basis: [
          {
            type: basisRef.startsWith("fact_")
              ? "fact"
              : basisRef.startsWith("asm_")
                ? "assumption"
                : basisRef.startsWith("pat_")
                  ? "pattern"
                  : "inference",
            ref: basisRef || undefined,
            label: basisRef || "agent inference",
          },
        ],
        strength: Math.max(0, Math.min(100, Math.round(num(args.strength, 60)))),
        status: "standing",
        round: decision.round,
        createdBy: "agent",
        channel: currentChannel(),
        createdAt: now(),
      };

      state().addArgument(argument);
      spotlight(argument.id);

      return toolResult(
        `Added a ${argument.stance} argument from the ${argument.perspective} seat.`,
        { argumentId: argument.id, claim: argument.claim },
      );
    },
  },

  {
    name: "challenge_argument",
    group: "debate",
    humanLabel: "Challenge an existing argument",
    description:
      "Challenge an argument already on the table. This attaches your counter-claim to it and marks the original unresolved — it does not delete it, because the founder needs to see the disagreement. Use it when an argument rests on something the Company Brain contradicts, or when it assumes a number the founder's history shows is unreliable. Call get_current_decision first to get the argument id.",
    inputSchema: {
      type: "object",
      properties: {
        argument_id: {
          type: "string",
          description: "The id of the argument being challenged, e.g. arg_x1y2z3.",
        },
        challenge: {
          type: "string",
          description: "One sentence naming what is wrong with it.",
        },
        reasoning: { type: "string", description: "Why, specifically, for this company." },
        weakens_by: {
          type: "number",
          description: "0-40. How much this should reduce the argument's strength. Defaults to 15.",
        },
      },
      required: ["argument_id", "challenge"],
    },
    execute: (args) => {
      const s = state();
      const argumentId = str(args.argument_id);
      const target = s.argumentList.find((a) => a.id === argumentId);
      if (!target) {
        return toolError(
          `No argument with id "${argumentId}". Call get_current_decision for valid ids.`,
        );
      }

      const weakensBy = Math.max(0, Math.min(40, Math.round(num(args.weakens_by, 15))));
      const challenge = str(args.challenge);

      const counter: Argument = {
        id: id("arg"),
        decisionId: target.decisionId,
        perspective: "contrarian",
        stance: target.stance === "for" ? "against" : "for",
        claim: challenge,
        reasoning: str(args.reasoning, challenge),
        basis: [{ type: "inference", label: `challenges ${target.id}` }],
        strength: Math.min(100, target.strength + 5),
        status: "standing",
        round: s.decisions.find((d) => d.id === target.decisionId)?.round ?? 0,
        createdBy: "agent",
        channel: currentChannel(),
        challengesId: target.id,
        createdAt: now(),
      };

      s.addArgument(counter);
      s.updateArgument(target.id, {
        status: "unresolved",
        strength: Math.max(0, target.strength - weakensBy),
      });
      spotlight(counter.id);

      return toolResult(
        `Challenged "${target.claim}". Its strength fell from ${target.strength} to ${Math.max(0, target.strength - weakensBy)} and it is now marked unresolved.`,
        { challengeId: counter.id, challengedArgumentId: target.id },
      );
    },
  },

  {
    name: "request_evidence",
    group: "debate",
    humanLabel: "Request evidence",
    description:
      "Put a specific, checkable evidence request on the record — something the founder could look up that would settle a disagreement. The Arena blocks commitment while requests are outstanding, so ask only for things that would actually change the decision. 'Do more research' is not a request; 'the completion rate for the last 20 signups' is.",
    inputSchema: {
      type: "object",
      properties: {
        statement: {
          type: "string",
          description: "The specific thing the founder should check.",
        },
        argument_id: {
          type: "string",
          description: "The argument that hinges on this, if any.",
        },
      },
      required: ["statement"],
    },
    execute: (args) => {
      const decision = resolveDecision();
      if (!decision) return toolError("There is no decision open in the Arena.");
      const statement = str(args.statement);
      if (!statement) return toolError("An evidence request needs a statement.");

      const evidenceId = id("ev");
      state().addEvidence({
        id: evidenceId,
        decisionId: decision.id,
        statement,
        status: "requested",
        requestedBy: "agent",
        argumentId: str(args.argument_id) || undefined,
        createdAt: now(),
      });
      spotlight(evidenceId);

      return toolResult(`Evidence requested: ${statement}`, { evidenceId });
    },
  },

  {
    name: "flag_contradiction",
    group: "debate",
    humanLabel: "Flag a contradiction",
    description:
      "Record two things the founder appears to believe that cannot both be true — for example a stated priority that this decision reverses, or a past rationale that contradicts today's. This is the sharpest tool in the Arena, so it must be earned: quote both sides from the Company Brain, the decision history or the founder's own defenses. Do not flag mere tension or trade-offs.",
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One line naming the tension." },
        side_a: { type: "string", description: "The first belief, quoted or cited." },
        side_b: { type: "string", description: "The second belief that conflicts with it." },
      },
      required: ["summary", "side_a", "side_b"],
    },
    execute: (args) => {
      const decision = resolveDecision();
      if (!decision) return toolError("There is no decision open in the Arena.");

      const summary = str(args.summary);
      const sideA = str(args.side_a);
      const sideB = str(args.side_b);
      if (!summary || !sideA || !sideB) {
        return toolError(
          "A contradiction needs a summary and both conflicting sides.",
        );
      }

      const contradictionId = id("con");
      state().addContradiction({
        id: contradictionId,
        decisionId: decision.id,
        summary,
        sideA,
        sideB,
        resolved: false,
        createdBy: "agent",
        channel: currentChannel(),
        createdAt: now(),
      });
      spotlight(contradictionId);

      return toolResult(
        `Contradiction flagged: ${summary}. Commitment is blocked until the founder resolves it.`,
        { contradictionId },
      );
    },
  },

  {
    name: "add_risk",
    group: "debate",
    humanLabel: "Add a risk",
    description:
      "Add a risk to the open decision. A risk is a specific way this decision could go wrong for this company, with a severity from 1 to 5 and a likelihood. Check get_open_risks first — sharpening an existing risk is more useful than adding a near-duplicate.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short name for the risk." },
        detail: { type: "string", description: "What goes wrong, and how it would show up." },
        severity: { type: "number", description: "1-5. Defaults to 3." },
        likelihood: { type: "string", enum: ["low", "medium", "high"] },
        perspective: { type: "string", enum: PERSPECTIVE_VALUES },
      },
      required: ["title", "detail"],
    },
    execute: (args) => {
      const decision = resolveDecision();
      if (!decision) return toolError("There is no decision open in the Arena.");

      const title = str(args.title);
      if (!title) return toolError("A risk needs a title.");

      const riskId = id("risk");
      state().addRisk({
        id: riskId,
        decisionId: decision.id,
        title,
        detail: str(args.detail, title),
        severity: Math.max(1, Math.min(5, Math.round(num(args.severity, 3)))),
        likelihood:
          args.likelihood === "low" || args.likelihood === "high"
            ? args.likelihood
            : "medium",
        status: "open",
        perspective: PERSPECTIVE_VALUES.includes(args.perspective as PerspectiveId)
          ? (args.perspective as PerspectiveId)
          : null,
        createdBy: "agent",
        channel: currentChannel(),
        createdAt: now(),
      });
      spotlight(riskId);

      return toolResult(`Risk added: ${title}`, { riskId });
    },
  },
];
