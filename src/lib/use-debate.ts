"use client";

import { useCallback, useState } from "react";

import { ApiError, post, readEventStream } from "@/lib/api";
import { detectPatterns } from "@/lib/calibration";
import { landArguments, makeNote, nextNoteSeat } from "@/lib/board";
import { landRoundOnCanvas } from "@/lib/canvas-model";
import { id, now } from "@/lib/id";
import type { DebateOpenEvent, DebateOpeningRound } from "@/lib/reading";
import { argumentsFor, decisionHistory } from "@/lib/selectors";
import { useArena, type ArenaState } from "@/lib/store";
import type {
  Argument,
  ArgumentStance,
  Decision,
  PerspectiveId,
  Reassessment,
} from "@/lib/types";

/**
 * The debate loop, as the UI uses it.
 *
 * Server calls produce structured rounds; this turns them into workspace
 * records. Nothing arrives on screen that is not also a record an agent can
 * read back through WebMCP.
 */

export type OpeningResponse = DebateOpeningRound;

interface DefenseResponse {
  reassessments: Array<{
    argumentId: string;
    verdict: Reassessment["verdict"];
    addressed: string;
    unaddressed: string;
    reply?: string;
    strengthDelta: number;
  }>;
  newArguments: Array<{
    perspective: PerspectiveId;
    stance: ArgumentStance;
    claim: string;
    reasoning: string;
    basis: Array<{ type: string; ref?: string; label: string }>;
    strength: number;
    challengesId?: string;
  }>;
  newRisks: Array<{
    title: string;
    detail: string;
    severity: number;
    likelihood: "low" | "medium" | "high";
    perspective: PerspectiveId | null;
  }>;
  newContradictions: Array<{ summary: string; sideA: string; sideB: string }>;
  arenaConfidence: number;
  arenaConfidenceRationale: string;
}

export interface ReadinessResponse {
  strongestForId: string | null;
  strongestAgainstId: string | null;
  keyAssumptionId: string | null;
  keyAssumptionNote: string;
  biggestUnresolvedRisk: string;
  recommendedTest: string;
  arenaConfidence: number;
  verdict: string;
}

/** The slice of workspace the debate routes need. */
function debateContext(state: ArenaState, question: string, founderContext: string) {
  return {
    brain: state.company!.brain,
    question,
    founderContext,
    patterns: state.company
      ? detectPatterns(state.company.id, state.predictions, state.decisions)
      : state.patterns,
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

function toBasis(
  basis: Array<{ type: string; ref?: string; label: string }>,
): Argument["basis"] {
  return basis.map((item) => ({
    type:
      item.type === "fact" ||
      item.type === "assumption" ||
      item.type === "pattern"
        ? item.type
        : "inference",
    ref: item.ref,
    label: item.label,
  }));
}

export function useDebate() {
  const [busy, setBusy] = useState<null | "opening" | "defending" | "readiness">(
    null,
  );
  const [openingReady, setOpeningReady] = useState<PerspectiveId[]>([]);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(
    null,
  );

  const clearError = useCallback(() => setError(null), []);

  function capture(caught: unknown) {
    if (caught instanceof ApiError) {
      setError({ message: caught.message, hint: caught.hint });
    } else if (caught instanceof Error) {
      setError({ message: caught.message });
    } else {
      setError({ message: "The Arena hit an unexpected problem." });
    }
  }

  /**
   * Runs round one. Creates the decision when `existingDecisionId` is absent,
   * and otherwise fills an existing one — which is how a decision reopened
   * from the history gets a round of arguments.
   */
  const open = useCallback(
    async (
      question: string,
      founderContext: string,
      existingDecisionId?: string,
    ): Promise<Decision | null> => {
      setError(null);
      setOpeningReady([]);
      setBusy("opening");

      const state = useArena.getState();
      if (!state.company) {
        setBusy(null);
        setError({ message: "Build a Company Brain before opening a decision." });
        return null;
      }

      try {
        const collected: { round: OpeningResponse | null } = { round: null };
        const timeout = AbortSignal.timeout(90_000);
        await readEventStream<DebateOpenEvent>(
          "/api/debate/open",
          debateContext(state, question, founderContext),
          (event) => {
            if (event.type === "perspective") {
              setOpeningReady((current) =>
                current.includes(event.perspective)
                  ? current
                  : [...current, event.perspective],
              );
            }
            if (event.type === "error") {
              throw new ApiError(event.message, event.hint);
            }
            if (event.type === "done") {
              collected.round = event.round;
            }
          },
          timeout,
        );
        const round = collected.round;
        if (!round) {
          throw new ApiError(
            "The specialists started, but the round never arrived.",
          );
        }

        const existing = existingDecisionId
          ? useArena.getState().decisions.find((d) => d.id === existingDecisionId)
          : undefined;

        const decision =
          existing ??
          state.createDecision({
            question,
            context: founderContext || round.contextNote,
            options: round.options.map((option) => ({
              id: id("opt"),
              label: option.label,
              detail: option.detail,
            })),
          });

        const store = useArena.getState();
        store.updateDecision(decision.id, {
          agentConfidence: round.arenaConfidence,
          round: 1,
          status: "open",
          // A decision reopened from history keeps its own options if it has
          // them; otherwise take the ones this round proposed.
          ...(existing && existing.options.length === 0
            ? {
                options: round.options.map((option) => ({
                  id: id("opt"),
                  label: option.label,
                  detail: option.detail,
                })),
              }
            : {}),
        });
        store.setActiveDecision(decision.id);

        if (!existing && state.company) {
          store.adoptBoardMarks(state.company.id, decision.id);
          store.adoptCanvas(state.company.id, decision.id);
        }

        const created = round.arguments.map((argument) => ({
          id: id("arg"),
          decisionId: decision.id,
          perspective: argument.perspective,
          stance: argument.stance,
          claim: argument.claim,
          reasoning: argument.reasoning,
          basis: toBasis(argument.basis),
          strength: argument.strength,
          status: "standing" as const,
          round: 1,
          createdBy: "arena" as const,
          createdAt: now(),
        }));
        store.addArguments(created);
        store.addBoardMarks(
          landArguments(
            created,
            store.boardMarks.filter((mark) => mark.decisionId === decision.id),
          ),
        );

        for (const risk of round.risks) {
          store.addRisk({
            id: id("risk"),
            decisionId: decision.id,
            title: risk.title,
            detail: risk.detail,
            severity: risk.severity,
            likelihood: risk.likelihood,
            status: "open",
            perspective: risk.perspective,
            createdBy: "arena",
            createdAt: now(),
          });
        }

        for (const contradiction of round.contradictions) {
          store.addContradiction({
            id: id("con"),
            decisionId: decision.id,
            summary: contradiction.summary,
            sideA: contradiction.sideA,
            sideB: contradiction.sideB,
            resolved: false,
            createdBy: "arena",
            createdAt: now(),
          });
        }

        for (const request of round.evidenceRequests) {
          store.addEvidence({
            id: id("ev"),
            decisionId: decision.id,
            statement: request,
            status: "requested",
            requestedBy: "arena",
            createdAt: now(),
          });
        }

        const live = useArena.getState();
        const landed = landRoundOnCanvas({
          decisionId: decision.id,
          existing: (live.canvasNodes ?? []).filter(
            (node) => node.decisionId === decision.id,
          ),
          arguments: created,
          risks: live.risks.filter((risk) => risk.decisionId === decision.id),
          evidence: live.evidence.filter((item) => item.decisionId === decision.id),
          contradictions: live.contradictions.filter(
            (item) => item.decisionId === decision.id,
          ),
        });
        live.addCanvasNodes(landed.nodes);
        live.addCanvasLinks(landed.links);

        return decision;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setError({
            message: "The round took too long to open.",
            hint: "Try again. The specialists now run in parallel on a faster model.",
          });
          return null;
        }
        capture(caught);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  /** The founder pushes back; the Arena reassesses without caving. */
  const defend = useCallback(
    async (
      decisionId: string,
      text: string,
      targetArgumentId: string | null,
    ): Promise<boolean> => {
      setError(null);
      setBusy("defending");

      const state = useArena.getState();
      const decision = state.decisions.find((d) => d.id === decisionId);
      if (!state.company || !decision) {
        setBusy(null);
        setError({ message: "That decision is no longer open." });
        return false;
      }

      const live = argumentsFor(state, decisionId);
      const defenseId = id("def");
      const round = decision.round + 1;

      state.addDefense({
        id: defenseId,
        decisionId,
        argumentId: targetArgumentId,
        text,
        round,
        createdAt: now(),
      });
      const seat = nextNoteSeat(
        state.boardMarks.filter((mark) => mark.decisionId === decisionId),
      );
      state.addBoardMark(
        makeNote({
          decisionId,
          text,
          x: seat.x,
          y: seat.y,
          author: "founder",
        }),
      );

      try {
        const response = await post<DefenseResponse>("/api/debate/defend", {
          context: debateContext(state, decision.question, decision.context),
          arguments: live.map((argument) => ({
            id: argument.id,
            perspective: argument.perspective,
            stance: argument.stance,
            claim: argument.claim,
            reasoning: argument.reasoning,
            strength: argument.strength,
            status: argument.status,
          })),
          defense: text,
          targetArgumentId,
          arenaConfidence: decision.agentConfidence,
        });

        const store = useArena.getState();
        const known = new Set(live.map((argument) => argument.id));

        store.addReassessments(
          response.reassessments
            .filter((item) => known.has(item.argumentId))
            .map((item) => ({
              id: id("rea"),
              decisionId,
              defenseId,
              argumentId: item.argumentId,
              perspective:
                live.find((argument) => argument.id === item.argumentId)
                  ?.perspective ?? "contrarian",
              verdict: item.verdict,
              addressed: item.addressed,
              unaddressed: item.unaddressed,
              reply: item.reply,
              strengthDelta: item.strengthDelta,
              createdAt: now(),
            })),
        );

        const created = response.newArguments.map((argument) => ({
          id: id("arg"),
          decisionId,
          perspective: argument.perspective,
          stance: argument.stance,
          claim: argument.claim,
          reasoning: argument.reasoning,
          basis: toBasis(argument.basis),
          strength: argument.strength,
          status: "standing" as const,
          round,
          createdBy: "arena" as const,
          challengesId: argument.challengesId,
          createdAt: now(),
        }));
        store.addArguments(created);
        store.addBoardMarks(
          landArguments(
            created,
            store.boardMarks.filter((mark) => mark.decisionId === decisionId),
          ),
        );

        for (const risk of response.newRisks) {
          store.addRisk({
            id: id("risk"),
            decisionId,
            title: risk.title,
            detail: risk.detail,
            severity: risk.severity,
            likelihood: risk.likelihood,
            status: "open",
            perspective: risk.perspective,
            createdBy: "arena",
            createdAt: now(),
          });
        }

        for (const contradiction of response.newContradictions) {
          store.addContradiction({
            id: id("con"),
            decisionId,
            summary: contradiction.summary,
            sideA: contradiction.sideA,
            sideB: contradiction.sideB,
            resolved: false,
            createdBy: "arena",
            createdAt: now(),
          });
        }

        const after = useArena.getState();
        const landed = landRoundOnCanvas({
          decisionId,
          existing: (after.canvasNodes ?? []).filter(
            (node) => node.decisionId === decisionId,
          ),
          arguments: created,
          risks: after.risks.filter((risk) => risk.decisionId === decisionId),
          evidence: after.evidence.filter((item) => item.decisionId === decisionId),
          contradictions: after.contradictions.filter(
            (item) => item.decisionId === decisionId,
          ),
        });
        after.addCanvasNodes(landed.nodes);
        after.addCanvasLinks(landed.links);

        store.updateDecision(decisionId, {
          round,
          agentConfidence: response.arenaConfidence,
        });

        return true;
      } catch (caught) {
        capture(caught);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const summarise = useCallback(
    async (decisionId: string): Promise<ReadinessResponse | null> => {
      setError(null);
      setBusy("readiness");

      const state = useArena.getState();
      const decision = state.decisions.find((d) => d.id === decisionId);
      if (!state.company || !decision) {
        setBusy(null);
        return null;
      }

      try {
        return await post<ReadinessResponse>("/api/decision/readiness", {
          context: debateContext(state, decision.question, decision.context),
          arguments: argumentsFor(state, decisionId).map((argument) => ({
            id: argument.id,
            perspective: argument.perspective,
            stance: argument.stance,
            claim: argument.claim,
            reasoning: argument.reasoning,
            strength: argument.strength,
            status: argument.status,
          })),
          risks: state.risks
            .filter((risk) => risk.decisionId === decisionId)
            .map((risk) => ({
              id: risk.id,
              title: risk.title,
              detail: risk.detail,
              status: risk.status,
            })),
          founderConfidence: decision.founderConfidence,
        });
      } catch (caught) {
        capture(caught);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return { busy, error, clearError, openingReady, open, defend, summarise };
}
