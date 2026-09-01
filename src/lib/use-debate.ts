"use client";

import { useCallback, useState } from "react";

import { ApiError, post, readEventStream } from "@/lib/api";
import { detectPatterns } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { OpeningPaintError, paintOpeningRound } from "@/lib/paint-opening";
import type { DebateDefendEvent, DebateOpeningRound } from "@/lib/reading";
import { argumentsFor, decisionHistory } from "@/lib/selectors";
import { useArena, type ArenaState } from "@/lib/store";
import type {
  ArgumentStance,
  Decision,
  PerspectiveId,
  Reassessment,
} from "@/lib/types";
import { runTool } from "@/webmcp/run";

/**
 * The debate loop.
 *
 * The server only proposes structured rounds. Every durable write goes through
 * WebMCP tools (`open_decision`, `add_argument`, `add_defense`, …) so the
 * seats, the founder, and a browser agent share one protocol.
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

async function arenaCall(name: string, args: Record<string, unknown>) {
  const result = await runTool(name, args, { channel: "arena" });
  if (!result.ok) {
    throw new ApiError(result.text || `${name} failed.`);
  }
  return result;
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
        const painted = await paintOpeningRound({
          question,
          founderContext,
          existingDecisionId,
          signal: AbortSignal.timeout(90_000),
        });
        setOpeningReady(useArena.getState().openingReady);
        return (
          useArena.getState().decisions.find(
            (item) => item.id === painted.decisionId,
          ) ?? null
        );
      } catch (caught) {
        if (caught instanceof OpeningPaintError) {
          setError({ message: caught.message, hint: caught.hint });
          return null;
        }
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

  const defend = useCallback(
    async (
      decisionId: string,
      text: string,
      targetArgumentId: string | null,
    ): Promise<boolean> => {
      setError(null);
      setBusy("defending");

      const state = useArena.getState();
      const decision = state.decisions.find((item) => item.id === decisionId);
      if (!state.company || !decision) {
        setBusy(null);
        setError({ message: "That decision is no longer open." });
        return false;
      }

      const live = argumentsFor(state, decisionId);

      try {
        const defense = await runTool(
          "add_defense",
          {
            text,
            argument_id: targetArgumentId,
            decision_id: decisionId,
          },
          { channel: "founder" },
        );
        if (!defense.ok) throw new ApiError(defense.text);
        const defenseId =
          typeof defense.data?.defenseId === "string" ? defense.data.defenseId : "";
        if (!defenseId) {
          throw new ApiError("add_defense did not return a defense id.");
        }

        const known = new Set(live.map((argument) => argument.id));
        const localIds = new Map<string, string>();
        const collected: { round: DefenseResponse | null } = { round: null };
        const timeout = AbortSignal.timeout(90_000);

        const paintSeat = (
          item: DefenseResponse["reassessments"][number],
          streaming: boolean,
        ) => {
          if (!known.has(item.argumentId)) return;
          let reaId = localIds.get(item.argumentId);
          if (!reaId) {
            reaId = id("rea");
            localIds.set(item.argumentId, reaId);
          }
          useArena.getState().upsertReassessment(
            {
              id: reaId,
              decisionId,
              defenseId,
              argumentId: item.argumentId,
              perspective:
                live.find((argument) => argument.id === item.argumentId)
                  ?.perspective ?? "contrarian",
              verdict: item.verdict ?? "unmoved",
              addressed: item.addressed ?? "",
              unaddressed: item.unaddressed ?? "",
              reply: item.reply,
              strengthDelta: 0,
              streaming,
              createdAt: now(),
            },
            false,
          );
        };

        await readEventStream<DebateDefendEvent>(
          "/api/debate/defend",
          {
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
          },
          (event) => {
            if (event.type === "error") {
              throw new ApiError(event.message, event.hint);
            }
            if (event.type === "partial") {
              for (const item of event.reassessments) {
                paintSeat(
                  {
                    argumentId: item.argumentId,
                    verdict: item.verdict ?? "unmoved",
                    addressed: item.addressed ?? "",
                    unaddressed: item.unaddressed ?? "",
                    reply: item.reply,
                    strengthDelta: item.strengthDelta ?? 0,
                  },
                  true,
                );
              }
            }
            if (event.type === "done") {
              collected.round = event.round;
            }
          },
          timeout,
        );

        const response = collected.round;
        if (!response) {
          throw new ApiError(
            "The seats started writing, but the round never landed.",
          );
        }

        await Promise.all(
          response.reassessments.map((item) =>
            arenaCall("add_reassessment", {
              argument_id: item.argumentId,
              defense_id: defenseId,
              verdict: item.verdict,
              addressed: item.addressed,
              unaddressed: item.unaddressed,
              reply: item.reply,
              strength_delta: item.strengthDelta,
              id: localIds.get(item.argumentId),
              decision_id: decisionId,
            }),
          ),
        );

        await Promise.all(
          response.newArguments.map((argument) =>
            arenaCall("add_argument", {
              perspective: argument.perspective,
              stance: argument.stance,
              claim: argument.claim,
              reasoning: argument.reasoning,
              basis_items: argument.basis,
              strength: argument.strength,
              challenges_id: argument.challengesId,
              decision_id: decisionId,
            }),
          ),
        );

        await Promise.all([
          ...response.newRisks.map((risk) =>
            arenaCall("add_risk", {
              title: risk.title,
              detail: risk.detail,
              severity: risk.severity,
              likelihood: risk.likelihood,
              perspective: risk.perspective ?? undefined,
              decision_id: decisionId,
            }),
          ),
          ...response.newContradictions.map((item) =>
            arenaCall("flag_contradiction", {
              summary: item.summary,
              side_a: item.sideA,
              side_b: item.sideB,
              decision_id: decisionId,
            }),
          ),
        ]);

        await arenaCall("set_confidence", {
          arena: response.arenaConfidence,
          decision_id: decisionId,
        });

        return true;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setError({
            message: "The seats took too long to answer.",
            hint: "Try again. Their replies now stream as they write.",
          });
          return false;
        }
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
      const decision = state.decisions.find((item) => item.id === decisionId);
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
