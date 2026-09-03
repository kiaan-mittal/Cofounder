"use client";

import { makeDrawing, makeNote, marksForArgument, nextNoteSeat } from "@/lib/board";
import { landRoundOnCanvas } from "@/lib/canvas-model";
import { id, now } from "@/lib/id";
import { activeDecision } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Argument, PerspectiveId, Reassessment } from "@/lib/types";
import {
  actorFromChannel,
  currentChannel,
  type ArenaTool,
} from "@/webmcp/registry";
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

function asLevel(value: unknown): "low" | "medium" | "high" {
  const v = String(value ?? "").toLowerCase();
  if (v === "low" || v === "high") return v;
  return "medium";
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

function landAdded(
  decisionId: string,
  patch: {
    arguments?: Parameters<typeof landRoundOnCanvas>[0]["arguments"];
    risks?: Parameters<typeof landRoundOnCanvas>[0]["risks"];
    evidence?: Parameters<typeof landRoundOnCanvas>[0]["evidence"];
    contradictions?: Parameters<typeof landRoundOnCanvas>[0]["contradictions"];
  },
) {
  const s = state();
  const landed = landRoundOnCanvas({
    decisionId,
    existing: (s.canvasNodes ?? []).filter((node) => node.decisionId === decisionId),
    arguments: patch.arguments ?? [],
    risks: patch.risks ?? [],
    evidence: patch.evidence ?? [],
    contradictions: patch.contradictions ?? [],
  });
  if (landed.nodes.length) s.addCanvasNodes(landed.nodes);
  if (landed.links.length) s.addCanvasLinks(landed.links);
}

function parseBasis(args: Record<string, unknown>): Argument["basis"] {
  if (Array.isArray(args.basis_items)) {
    return args.basis_items
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
      .map((item) => ({
        type:
          item.type === "fact" ||
          item.type === "assumption" ||
          item.type === "pattern"
            ? item.type
            : "inference",
        ref: typeof item.ref === "string" ? item.ref : undefined,
        label:
          typeof item.label === "string" && item.label.trim()
            ? item.label.trim()
            : "cited",
      }));
  }
  const basisRef = str(args.basis);
  return [
    {
      type: basisRef.startsWith("fact_")
        ? "fact"
        : basisRef.startsWith("asm_")
          ? "assumption"
          : basisRef.startsWith("pat_")
            ? "pattern"
            : "inference",
      ref: basisRef || undefined,
      label: basisRef || "inference",
    },
  ];
}

export const debateTools: ArenaTool[] = [
  {
    name: "add_argument",
    group: "debate",
    humanLabel: "Add an argument",
    description:
      "Adds a structured seat claim to the shared table: position (for/against), strength 0-100, one-sentence claim, evidence, residual risk, and reversibility. It lands as a card on the founder's board rather than as a chat reply, and can be marked as challenging an argument already there. Returns the new argument id.",
    annotations: { untrustedContentHint: true },
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
          description: "Two to four sentences of company-specific support. This is the seat's argument, not a caption.",
        },
        basis: {
          type: "string",
          description:
            "A Company Brain fact or assumption id (fact_… / asm_…) or pattern id this rests on.",
        },
        basis_items: {
          type: "array",
          description:
            "The basis as a structured list, which supersedes the single basis string.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Fact, assumption or pattern id." },
              label: { type: "string", description: "What that source says." },
            },
            required: ["id"],
          },
        },
        challenges_id: {
          type: "string",
          description:
            "Id of the argument this one directly challenges, when it challenges one.",
        },
        strength: {
          type: "number",
          description: "How much weight the argument deserves, 0-100. Defaults to 60.",
        },
        risk: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Residual risk if this seat is right. Defaults to medium.",
        },
        reversibility: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How easy it is to undo the implied move. Defaults to medium.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to write on. Defaults to the decision the founder has open.",
        },
      },
      required: ["perspective", "stance", "claim", "reasoning"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

      const claim = str(args.claim);
      if (!claim) return toolError("An argument needs a claim.");

      const actor = actorFromChannel();
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
        basis: parseBasis(args),
        strength: Math.max(0, Math.min(100, Math.round(num(args.strength, 60)))),
        riskLevel: asLevel(args.risk ?? args.risk_level),
        reversibility: asLevel(args.reversibility),
        status: "standing",
        round: decision.round,
        createdBy: actor,
        channel: currentChannel(),
        challengesId: str(args.challenges_id) || undefined,
        createdAt: now(),
      };

      state().addArgument(argument);
      state().addBoardMarks(
        marksForArgument(
          argument,
          state().boardMarks.filter((mark) => mark.decisionId === decision.id),
        ),
      );
      landAdded(decision.id, { arguments: [argument] });
      spotlight(argument.id);

      return toolResult(
        `Wrote a ${argument.stance} claim from the ${argument.perspective} seat (${argument.strength}/100).`,
        {
          argumentId: argument.id,
          claim: argument.claim,
          stance: argument.stance,
          strength: argument.strength,
          risk: argument.riskLevel,
          reversibility: argument.reversibility,
        },
      );
    },
  },

  {
    name: "challenge_argument",
    group: "debate",
    expose: false,
    humanLabel: "Challenge an existing argument",
    description:
      "Attaches a counter-claim to an argument already on the table and marks the original unresolved, reducing its strength. The original stays visible so the founder can see the disagreement. Returns the challenge id and the argument's new strength.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        argument_id: {
          type: "string",
          description:
            "Id of the argument being challenged, as returned by get_current_decision.",
        },
        challenge: {
          type: "string",
          description: "One sentence naming what is wrong with it.",
        },
        reasoning: {
          type: "string",
          description: "Why it is wrong, specifically for this company.",
        },
        weakens_by: {
          type: "number",
          description:
            "How much to reduce the argument's strength, 0-40. Defaults to 15.",
        },
      },
      required: ["argument_id", "challenge"],
      additionalProperties: false,
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
        createdBy: actorFromChannel(),
        channel: currentChannel(),
        challengesId: target.id,
        createdAt: now(),
      };

      s.addArgument(counter);
      s.addBoardMarks(
        marksForArgument(
          counter,
          s.boardMarks.filter((mark) => mark.decisionId === target.decisionId),
        ),
      );
      landAdded(target.decisionId, { arguments: [counter] });
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
      "Puts a specific, checkable evidence request on the record: something the founder could look up that would settle a disagreement. The floor blocks commitment while any request is outstanding. Returns the evidence id.",
    inputSchema: {
      type: "object",
      properties: {
        statement: {
          type: "string",
          description:
            "The exact thing to check, such as the completion rate for the last 20 signups.",
        },
        argument_id: {
          type: "string",
          description: "Id of the argument that hinges on this, when one does.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to record it against. Defaults to the decision the founder has open.",
        },
      },
      required: ["statement"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
      const statement = str(args.statement);
      if (!statement) return toolError("An evidence request needs a statement.");

      const evidenceId = id("ev");
      state().addEvidence({
        id: evidenceId,
        decisionId: decision.id,
        statement,
        status: "requested",
        requestedBy: actorFromChannel(),
        argumentId: str(args.argument_id) || undefined,
        createdAt: now(),
      });
      landAdded(decision.id, {
        evidence: [
          {
            id: evidenceId,
            statement,
            requestedBy: actorFromChannel(),
          },
        ],
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
      "Records two things the founder appears to believe that cannot both be true, such as a stated priority this decision reverses. It blocks commitment until the founder resolves it, and it holds only for a direct conflict, not a trade-off. Returns the contradiction id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One line naming the tension." },
        side_a: {
          type: "string",
          description:
            "The first belief, quoted from the Company Brain, the history or a defense.",
        },
        side_b: {
          type: "string",
          description: "The second belief, quoted, that conflicts with the first.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to flag it on. Defaults to the decision the founder has open.",
        },
      },
      required: ["summary", "side_a", "side_b"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

      const summary = str(args.summary);
      const sideA = str(args.side_a);
      const sideB = str(args.side_b);
      if (!summary || !sideA || !sideB) {
        return toolError(
          "A contradiction needs a summary and both conflicting sides.",
        );
      }

      const contradictionId = id("con");
      const s = state();
      s.addContradiction({
        id: contradictionId,
        decisionId: decision.id,
        summary,
        sideA,
        sideB,
        resolved: false,
        createdBy: actorFromChannel(),
        channel: currentChannel(),
        createdAt: now(),
      });
      const seat = nextNoteSeat(
        s.boardMarks.filter((mark) => mark.decisionId === decision.id),
      );
      s.addBoardMark(
        makeNote({
          decisionId: decision.id,
          text: `${summary}\n${sideA} / ${sideB}`,
          x: seat.x,
          y: seat.y,
          author: actorFromChannel(),
          channel: currentChannel(),
        }),
      );
      s.addBoardMark(
        makeDrawing({
          decisionId: decision.id,
          shape: "cross",
          x: Math.min(86, seat.x + 16),
          y: Math.max(2, seat.y - 3),
          w: 12,
          h: 12,
          author: actorFromChannel(),
          channel: currentChannel(),
        }),
      );
      landAdded(decision.id, {
        contradictions: [
          {
            id: contradictionId,
            summary,
            createdBy: actorFromChannel(),
          },
        ],
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
      "Adds a risk to a decision: a specific way it could go wrong for this company, carrying a severity from 1 to 5 and a likelihood. The risk stays open until the founder mitigates or accepts it. Returns the risk id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short name for the risk." },
        detail: {
          type: "string",
          description: "What goes wrong, and how it would show up.",
        },
        severity: {
          type: "number",
          description: "How bad it would be, 1-5. Defaults to 3.",
        },
        likelihood: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How likely it is to happen. Defaults to medium.",
        },
        perspective: {
          type: "string",
          enum: PERSPECTIVE_VALUES,
          description: "Which seat is raising the risk.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to add it to. Defaults to the decision the founder has open.",
        },
      },
      required: ["title", "detail"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");

      const title = str(args.title);
      if (!title) return toolError("A risk needs a title.");

      const riskId = id("risk");
      const s = state();
      s.addRisk({
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
        createdBy: actorFromChannel(),
        channel: currentChannel(),
        createdAt: now(),
      });
      const seat = nextNoteSeat(
        s.boardMarks.filter((mark) => mark.decisionId === decision.id),
      );
      s.addBoardMark(
        makeNote({
          decisionId: decision.id,
          text: `${title} — ${str(args.detail, title)}`,
          x: seat.x,
          y: seat.y,
          author: actorFromChannel(),
          channel: currentChannel(),
        }),
      );
      s.addBoardMark(
        makeDrawing({
          decisionId: decision.id,
          shape: "circle",
          x: Math.max(1, seat.x - 2),
          y: Math.max(1, seat.y - 2),
          w: 22,
          h: 16,
          author: actorFromChannel(),
          channel: currentChannel(),
        }),
      );
      landAdded(decision.id, {
        risks: [
          {
            id: riskId,
            title,
            detail: str(args.detail, title),
            createdBy: actorFromChannel(),
          },
        ],
      });
      spotlight(riskId);

      return toolResult(`Risk added: ${title}`, { riskId });
    },
  },

  {
    name: "resolve_contradiction",
    group: "debate",
    expose: false,
    humanLabel: "Resolve a contradiction",
    description:
      "Writes a resolution onto a flagged contradiction and closes it, recording how both sides can now stand or which one was dropped. Commitment stays blocked until every contradiction on the round is closed this way. Returns the contradiction id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        contradiction_id: {
          type: "string",
          description:
            "The contradiction id, as returned by get_current_decision, for example con_7b1c.",
        },
        resolution: {
          type: "string",
          description: "How the two sides now coexist, or which one was dropped.",
        },
      },
      required: ["contradiction_id", "resolution"],
      additionalProperties: false,
    },
    execute: (args) => {
      const contradictionId = str(args.contradiction_id);
      const resolution = str(args.resolution);
      if (!contradictionId || !resolution) {
        return toolError("A resolution needs the contradiction id and an explanation.");
      }
      const target = state().contradictions.find((c) => c.id === contradictionId);
      if (!target) {
        return toolError(
          `No contradiction with id "${contradictionId}". Call get_current_decision for valid ids.`,
        );
      }
      state().resolveContradiction(contradictionId, resolution);
      spotlight(contradictionId);
      return toolResult(`Contradiction resolved: ${target.summary}`, {
        contradictionId,
        resolution,
      });
    },
  },

  {
    name: "set_risk_status",
    group: "debate",
    expose: false,
    humanLabel: "Mitigate or accept a risk",
    description:
      "Changes a risk's status to mitigated, accepted, or open again. Mitigated records that a concrete control is in place; accepted records that the founder is taking the risk on knowingly. Returns the new status.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        risk_id: {
          type: "string",
          description:
            "The risk id, as returned by get_current_decision, for example risk_3d90.",
        },
        status: {
          type: "string",
          enum: ["open", "mitigated", "accepted"],
          description: "The status to move the risk to.",
        },
      },
      required: ["risk_id", "status"],
      additionalProperties: false,
    },
    execute: (args) => {
      const riskId = str(args.risk_id);
      const status = args.status;
      if (
        status !== "open" &&
        status !== "mitigated" &&
        status !== "accepted"
      ) {
        return toolError('status must be "open", "mitigated", or "accepted".');
      }
      const target = state().risks.find((r) => r.id === riskId);
      if (!target) {
        return toolError(
          `No risk with id "${riskId}". Call get_current_decision for valid ids.`,
        );
      }
      state().updateRisk(riskId, { status });
      spotlight(riskId);
      return toolResult(`Risk "${target.title}" is now ${status}.`, {
        riskId,
        status,
      });
    },
  },

  {
    name: "mark_evidence",
    group: "debate",
    expose: false,
    humanLabel: "Mark evidence provided or unavailable",
    description:
      "Updates an evidence request to provided, when the founder produced the checkable thing, or unavailable, when it cannot be produced. Requests left outstanding continue to block commitment. Returns the new status.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        evidence_id: {
          type: "string",
          description:
            "The evidence id, as returned by get_current_decision, for example ev_2a51.",
        },
        status: {
          type: "string",
          enum: ["provided", "unavailable", "requested"],
          description: "The status to move the request to.",
        },
      },
      required: ["evidence_id", "status"],
      additionalProperties: false,
    },
    execute: (args) => {
      const evidenceId = str(args.evidence_id);
      const status = args.status;
      if (
        status !== "provided" &&
        status !== "unavailable" &&
        status !== "requested"
      ) {
        return toolError('status must be "provided", "unavailable", or "requested".');
      }
      const target = state().evidence.find((e) => e.id === evidenceId);
      if (!target) {
        return toolError(
          `No evidence with id "${evidenceId}". Call get_current_decision for valid ids.`,
        );
      }
      state().updateEvidence(evidenceId, { status });
      spotlight(evidenceId);
      return toolResult(`Evidence "${target.statement}" is now ${status}.`, {
        evidenceId,
        status,
      });
    },
  },

  {
    name: "add_defense",
    group: "debate",
    humanLabel: "Record a founder defense",
    description:
      "Writes the founder's defense onto the record — what they are putting against one seat's claim, or against the round as a whole — and shows it as a note on the board. The seats reassess afterwards. Returns the defense id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What the founder is saying." },
        argument_id: {
          type: "string",
          description:
            "Id of the argument they are answering. Omit when answering the round as a whole.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision to record it on. Defaults to the decision the founder has open.",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
      const text = str(args.text);
      if (!text) return toolError("A defense needs text.");
      const actor = actorFromChannel();
      const defenseId = id("def");
      const argumentId = str(args.argument_id) || null;
      state().addDefense({
        id: defenseId,
        decisionId: decision.id,
        argumentId,
        text,
        round: decision.round + 1,
        createdAt: now(),
      });
      const seat = nextNoteSeat(
        state().boardMarks.filter((mark) => mark.decisionId === decision.id),
      );
      state().addBoardMark(
        makeNote({
          decisionId: decision.id,
          text,
          x: seat.x,
          y: seat.y,
          author: actor,
          channel: currentChannel(),
        }),
      );
      spotlight(defenseId);
      return toolResult("Defense is on the record.", {
        defenseId,
        argumentId,
        decisionId: decision.id,
      });
    },
  },

  {
    name: "add_reassessment",
    group: "debate",
    expose: false,
    humanLabel: "Record a seat's reply",
    description:
      "Writes one seat's reassessment of a founder defense onto the record: the full reply, what the defense addressed, what it left open, and the verdict, which adjusts the original argument's strength. Passing an existing id updates a reply that is still streaming. Returns the reassessment id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        argument_id: {
          type: "string",
          description: "Id of the argument the seat is reassessing.",
        },
        defense_id: {
          type: "string",
          description: "Id of the founder defense being answered.",
        },
        verdict: {
          type: "string",
          enum: ["conceded", "weakened", "unmoved", "reinforced"],
          description: "How the defense moved the seat's original position.",
        },
        addressed: {
          type: "string",
          description: "What the defense did answer.",
        },
        unaddressed: {
          type: "string",
          description: "What the defense left open.",
        },
        reply: { type: "string", description: "The seat speaking in full." },
        strength_delta: {
          type: "number",
          description:
            "How much to move the argument's strength, positive or negative. Inferred from verdict when omitted.",
        },
        id: {
          type: "string",
          description:
            "Id of a reassessment already started, to finish a streaming reply.",
        },
        decision_id: {
          type: "string",
          description:
            "Which decision this belongs to. Defaults to the decision the founder has open.",
        },
      },
      required: ["argument_id", "defense_id", "verdict"],
      additionalProperties: false,
    },
    execute: (args) => {
      const decision = resolveDecision(args.decision_id);
      if (!decision) return toolError("There is no decision open on the floor.");
      const argumentId = str(args.argument_id);
      const defenseId = str(args.defense_id);
      const target = state().argumentList.find((a) => a.id === argumentId);
      if (!target) {
        return toolError(
          `No argument with id "${argumentId}". Call get_current_decision for valid ids.`,
        );
      }
      const verdict = args.verdict;
      if (
        verdict !== "conceded" &&
        verdict !== "weakened" &&
        verdict !== "unmoved" &&
        verdict !== "reinforced"
      ) {
        return toolError("verdict must be conceded, weakened, unmoved, or reinforced.");
      }
      const item: Reassessment = {
        id: str(args.id) || id("rea"),
        decisionId: decision.id,
        defenseId,
        argumentId,
        perspective: target.perspective,
        verdict,
        addressed: str(args.addressed),
        unaddressed: str(args.unaddressed),
        reply: str(args.reply) || undefined,
        strengthDelta: Math.round(num(args.strength_delta, 0)),
        streaming: false,
        createdAt: now(),
      };
      state().upsertReassessment(item, true);
      spotlight(item.id);
      return toolResult(
        `${target.perspective} seat: ${verdict}.`,
        { reassessmentId: item.id, argumentId, verdict },
      );
    },
  },
];
