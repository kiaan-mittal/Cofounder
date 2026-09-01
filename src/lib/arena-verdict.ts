import { perspectiveSeat } from "@/lib/perspectives";
import {
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  openRisksFor,
  readiness,
  stillOpenFrom,
  reassessmentsFor,
} from "@/lib/selectors";
import type { ArenaState } from "@/lib/store";

/**
 * The decision matrix an agent (or the founder) reads after a round.
 *
 * Not an LLM opinion. Arithmetic on what is already on the table: stance
 * weights, open contradictions, outstanding evidence. A deadlock is the
 * honest result — seats can agree on the facts and still refuse the call.
 */

export type ArenaVerdict = {
  decisionId: string;
  question: string;
  deadlock: boolean;
  deadlockNote: string | null;
  leaning: "for" | "against" | "split" | "too-early";
  leaningLabel: string;
  arenaConfidence: number;
  strongestFor: { claim: string; seat: string; strength: number } | null;
  strongestAgainst: { claim: string; seat: string; strength: number } | null;
  contradictionsOpen: number;
  evidenceOutstanding: string[];
  biggestRisk: string | null;
  stillOpen: string[];
  whatWouldChangeIt: string;
  blockers: string[];
};

export function arenaVerdict(
  state: ArenaState,
  decisionId: string,
): ArenaVerdict | null {
  const decision = state.decisions.find((item) => item.id === decisionId);
  const args = argumentsFor(state, decisionId).filter(
    (item) => !item.challengesId && item.status !== "conceded",
  );
  if (!decision && args.length === 0) return null;

  const ready = readiness(state, decisionId);
  const forScore = args
    .filter((item) => item.stance === "for")
    .reduce((sum, item) => sum + item.strength, 0);
  const againstScore = args
    .filter((item) => item.stance === "against")
    .reduce((sum, item) => sum + item.strength, 0);
  const openCons = contradictionsFor(state, decisionId).filter((c) => !c.resolved);
  const missing = evidenceFor(state, decisionId).filter(
    (item) => item.status === "requested",
  );
  const holes = stillOpenFrom(reassessmentsFor(state, decisionId)).map(
    (item) => item.text,
  );
  const risks = openRisksFor(state, decisionId);

  const strongFor = (ready.strongestFor?.strength ?? 0) >= 55;
  const strongAgainst = (ready.strongestAgainst?.strength ?? 0) >= 55;
  const informationGap = missing.length > 0 || openCons.length > 0;
  const deadlock =
    args.length >= 2 && strongFor && strongAgainst && informationGap;

  let leaning: ArenaVerdict["leaning"] = "too-early";
  if (args.length >= 2) {
    const gap = forScore - againstScore;
    if (Math.abs(gap) < 40) leaning = "split";
    else leaning = gap > 0 ? "for" : "against";
  }

  const leaningLabel =
    leaning === "too-early"
      ? "The seats have not finished writing."
      : leaning === "split"
        ? "The seats refuse a clean call."
        : leaning === "for"
          ? "The weight on the table leans toward acting."
          : "The weight on the table leans against acting.";

  const whatWouldChangeIt =
    missing[0]?.statement ??
    holes[0] ??
    (openCons[0]
      ? `Resolve: ${openCons[0].summary}`
      : risks[0]
        ? `A control for: ${risks[0].title}`
        : "A number on the preferred option, with a date.");

  const deadlockNote = deadlock
    ? `Seats agree this is a real decision and still disagree on the call. Missing: ${whatWouldChangeIt}`
    : null;

  const clip = (argument: NonNullable<typeof ready.strongestFor>) => ({
    claim: argument.claim,
    seat: perspectiveSeat(argument.perspective),
    strength: argument.strength,
  });

  return {
    decisionId,
    question: decision?.question ?? "",
    deadlock,
    deadlockNote,
    leaning,
    leaningLabel,
    arenaConfidence: decision?.agentConfidence ?? 0,
    strongestFor: ready.strongestFor ? clip(ready.strongestFor) : null,
    strongestAgainst: ready.strongestAgainst
      ? clip(ready.strongestAgainst)
      : null,
    contradictionsOpen: openCons.length,
    evidenceOutstanding: missing.map((item) => item.statement),
    biggestRisk: risks[0]?.title ?? null,
    stillOpen: holes,
    whatWouldChangeIt,
    blockers: ready.blockers,
  };
}
