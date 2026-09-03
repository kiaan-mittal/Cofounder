"use client";

import { ApiError, readEventStream } from "@/lib/api";
import { arenaVerdict } from "@/lib/arena-verdict";
import { detectPatterns } from "@/lib/calibration";
import type { DebateOpenEvent, DebateOpeningRound } from "@/lib/reading";
import { decisionHistory } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import { runToolDirect } from "@/webmcp/run";

/**
 * Open a round onto the table as the seats finish writing.
 *
 * ChatGPT (or the founder) should not wait for a finished blob. The decision
 * appears first; each seat, risk, and contradiction lands as the server
 * emits it. Nested writes go through `runToolDirect` so a native
 * `stress_test_decision` call cannot deadlock inside `executeTool`.
 */

export class OpeningPaintError extends Error {
  readonly hint?: string;
  readonly decisionId: string | null;
  constructor(message: string, hint?: string, decisionId?: string | null) {
    super(message);
    this.name = "OpeningPaintError";
    this.hint = hint;
    this.decisionId = decisionId ?? null;
  }
}

function debateContext(question: string, founderContext: string) {
  const state = useArena.getState();
  if (!state.company) {
    throw new OpeningPaintError("Build a Company Brain before opening a decision.");
  }
  return {
    brain: state.company.brain,
    question,
    founderContext,
    patterns: detectPatterns(
      state.company.id,
      state.predictions,
      state.decisions,
    ),
    history: decisionHistory(state).map((entry) => ({
      question: entry.question,
      status: entry.status,
      chosenOption: entry.chosenOption,
      outcome: entry.outcome,
      predictions: entry.predictions.map((p) => ({
        expectedValue: p.expectedValue,
        actualValue: p.actualValue,
        unit: p.unit,
      })),
    })),
  };
}

async function call(name: string, args: Record<string, unknown>) {
  const result = await runToolDirect(name, args, { channel: "arena" });
  if (!result.ok) {
    throw new OpeningPaintError(result.text || `${name} failed.`);
  }
  return result;
}

export async function paintOpeningRound(input: {
  question: string;
  founderContext?: string;
  existingDecisionId?: string;
  signal?: AbortSignal;
}): Promise<{
  decisionId: string;
  round: DebateOpeningRound;
}> {
  const question = input.question.trim();
  if (question.length < 8) {
    throw new OpeningPaintError("A decision needs a real question.");
  }
  const founderContext = input.founderContext?.trim() ?? "";
  const context = debateContext(question, founderContext);

  const opened = await call("open_decision", {
    question,
    context: founderContext,
    ...(input.existingDecisionId ? { decision_id: input.existingDecisionId } : {}),
  });
  const decisionId =
    typeof opened.data?.decisionId === "string" ? opened.data.decisionId : "";
  if (!decisionId) {
    throw new OpeningPaintError("open_decision did not return a decision id.");
  }

  useArena.getState().beginOpening(decisionId);

  const seenArgs = new Set<string>();
  const seenRisks = new Set<string>();
  const seenCons = new Set<string>();
  const seenEvidence = new Set<string>();
  const seenActions = new Set<string>();
  const collected: { round: DebateOpeningRound | null } = { round: null };
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (work: () => Promise<void>) => {
    queue = queue.then(work, work);
  };

  async function writeFrame(
    frame: Pick<
      DebateOpeningRound,
      | "contextNote"
      | "options"
      | "arenaConfidence"
      | "risks"
      | "contradictions"
      | "evidenceRequests"
      | "verdictWhy"
      | "flipConditions"
      | "nextMove"
      | "nextMoveSteps"
    >,
  ) {
    await call("open_decision", {
      question,
      context: founderContext || frame.contextNote,
      options: frame.options,
      arena_confidence: frame.arenaConfidence,
      decision_id: decisionId,
    });
    useArena.getState().updateDecision(decisionId, {
      ...(frame.verdictWhy ? { verdictWhy: frame.verdictWhy } : {}),
      ...(frame.flipConditions?.length
        ? { flipConditions: frame.flipConditions }
        : {}),
      ...(frame.nextMove ? { nextMove: frame.nextMove } : {}),
      ...(frame.nextMoveSteps?.length
        ? { nextMoveSteps: frame.nextMoveSteps }
        : {}),
    });
    for (const step of frame.nextMoveSteps ?? []) {
      const text = step.trim();
      if (!text || seenActions.has(text)) continue;
      seenActions.add(text);
      await call("add_action_item", {
        text,
        decision_id: decisionId,
      });
    }
    for (const risk of frame.risks) {
      if (seenRisks.has(risk.title)) continue;
      seenRisks.add(risk.title);
      await call("add_risk", {
        title: risk.title,
        detail: risk.detail,
        severity: risk.severity,
        likelihood: risk.likelihood,
        perspective: risk.perspective ?? undefined,
        decision_id: decisionId,
      });
    }
    for (const item of frame.contradictions) {
      if (seenCons.has(item.summary)) continue;
      seenCons.add(item.summary);
      await call("flag_contradiction", {
        summary: item.summary,
        side_a: item.sideA,
        side_b: item.sideB,
        decision_id: decisionId,
      });
    }
    for (const statement of frame.evidenceRequests) {
      if (seenEvidence.has(statement)) continue;
      seenEvidence.add(statement);
      await call("request_evidence", {
        statement,
        decision_id: decisionId,
      });
    }
  }

  async function writeArgument(
    argument: DebateOpeningRound["arguments"][number],
  ) {
    if (seenArgs.has(argument.perspective)) return;
    const already = useArena
      .getState()
      .argumentList.some(
        (item) =>
          item.decisionId === decisionId &&
          item.perspective === argument.perspective &&
          !item.challengesId,
      );
    if (already) {
      seenArgs.add(argument.perspective);
      useArena.getState().markSeatReady(argument.perspective);
      return;
    }
    seenArgs.add(argument.perspective);
    useArena.getState().markSeatReady(argument.perspective);
    await call("add_argument", {
      perspective: argument.perspective,
      stance: argument.stance,
      claim: argument.claim,
      reasoning: argument.reasoning,
      basis_items: argument.basis,
      strength: argument.strength,
      risk: argument.riskLevel,
      reversibility: argument.reversibility,
      decision_id: decisionId,
    });
  }

  try {
    await readEventStream<DebateOpenEvent>(
      "/api/debate/open",
      context,
      (event) => {
        if (event.type === "error") {
          throw new ApiError(event.message, event.hint);
        }
        if (event.type === "frame") {
          enqueue(() => writeFrame(event.frame));
        }
        if (event.type === "perspective") {
          const argument = event.argument;
          if (argument) enqueue(() => writeArgument(argument));
        }
        if (event.type === "done") {
          collected.round = event.round;
        }
      },
      input.signal ?? AbortSignal.timeout(90_000),
    );

    await queue;

    const round = collected.round;
    if (!round) {
      throw new OpeningPaintError(
        "The specialists started, but the round never arrived.",
      );
    }

    await writeFrame(round);
    for (const argument of round.arguments) {
      await writeArgument(argument);
    }

    return { decisionId, round };
  } catch (caught) {
    if (caught instanceof OpeningPaintError) throw caught;
    if (caught instanceof ApiError) {
      throw new OpeningPaintError(caught.message, caught.hint, decisionId);
    }
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new OpeningPaintError(
        "The round took too long to open.",
        "Try again. The specialists run in parallel.",
        decisionId,
      );
    }
    throw new OpeningPaintError(
      caught instanceof Error ? caught.message : "Dissent could not open this round.",
      undefined,
      decisionId,
    );
  } finally {
    useArena.getState().endOpening();
  }
}

export function verdictFor(decisionId: string) {
  return arenaVerdict(useArena.getState(), decisionId);
}
