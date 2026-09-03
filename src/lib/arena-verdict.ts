import { perspectiveSeat } from "@/lib/perspectives";
import {
  actionItemsFor,
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  openRisksFor,
  readiness,
  stillOpenFrom,
  reassessmentsFor,
} from "@/lib/selectors";
import type { ArenaState } from "@/lib/store";
import type { Argument } from "@/lib/types";

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
  verdictLabel: string;
  why: string;
  arenaConfidence: number;
  forPct: number;
  againstPct: number;
  scores: {
    evidence: number;
    confidence: number;
    risk: number;
    reversibility: number;
    upside: number;
  };
  strongestFor: { claim: string; seat: string; strength: number } | null;
  strongestAgainst: { claim: string; seat: string; strength: number } | null;
  contradictionsOpen: number;
  evidenceOutstanding: string[];
  biggestRisk: string | null;
  stillOpen: string[];
  whatWouldChangeIt: string;
  flipConditions: string[];
  nextMove: string | null;
  nextMoveSteps: string[];
  blockers: string[];
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reversibilityScore(args: Argument[]) {
  if (!args.length) return 55;
  const weight = { high: 88, medium: 55, low: 22 };
  const total = args.reduce(
    (sum, item) => sum + weight[item.reversibility ?? "medium"],
    0,
  );
  return clamp(total / args.length);
}

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
  const actions = actionItemsFor(state, decisionId).filter((item) => !item.done);

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

  const total = forScore + againstScore;
  const forPct = total === 0 ? 50 : Math.round((forScore / total) * 100);
  const againstPct = 100 - forPct;

  const leaningLabel =
    leaning === "too-early"
      ? "The seats have not finished writing."
      : leaning === "split"
        ? "The seats refuse a clean call."
        : leaning === "for"
          ? "The weight on the table leans toward acting."
          : "The weight on the table leans against acting.";

  const holdOption =
    decision?.options.find((item) =>
      /hold|clerk|wait|keep|not yet|don't|do not/i.test(item.label),
    ) ?? decision?.options[1];
  const actOption =
    decision?.options.find((item) =>
      /guest|ship|open|proceed|act|public/i.test(item.label),
    ) ?? decision?.options[0];

  const verdictLabel =
    leaning === "against"
      ? (holdOption?.label ?? "Hold")
      : leaning === "for"
        ? (actOption?.label ?? "Act")
        : leaning === "split"
          ? "No clean call"
          : "Too early";

  const derivedFlips = [
    ...missing.map((item) => item.statement),
    ...risks.map((item) => `A control for: ${item.title}`),
    ...openCons.map((item) => `Resolve: ${item.summary}`),
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  const flipConditions = (
    decision?.flipConditions?.length ? decision.flipConditions : derivedFlips
  ).slice(0, 4);

  const whatWouldChangeIt =
    flipConditions[0] ??
    holes[0] ??
    "A number on the preferred option, with a date.";

  const why =
    decision?.verdictWhy?.trim() ||
    (leaning === "against"
      ? (ready.strongestAgainst?.claim ?? leaningLabel)
      : leaning === "for"
        ? (ready.strongestFor?.claim ?? leaningLabel)
        : leaningLabel);

  const nextMove =
    decision?.nextMove?.trim() || actions[0]?.text || null;
  const nextMoveSteps = (
    decision?.nextMoveSteps?.length
      ? decision.nextMoveSteps
      : actions.map((item) => item.text)
  ).slice(0, 5);

  const riskScore = clamp(
    risks.reduce((sum, item) => {
      const chance =
        item.likelihood === "high" ? 18 : item.likelihood === "medium" ? 11 : 6;
      return sum + item.severity * 6 + chance;
    }, args.length ? 12 : 0),
  );

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
    verdictLabel,
    why,
    arenaConfidence: decision?.agentConfidence ?? 0,
    forPct,
    againstPct,
    scores: {
      evidence: clamp(100 - missing.length * 18 - openCons.length * 12),
      confidence: decision?.agentConfidence ?? 0,
      risk: riskScore,
      reversibility: reversibilityScore(args),
      upside: forPct,
    },
    strongestFor: ready.strongestFor ? clip(ready.strongestFor) : null,
    strongestAgainst: ready.strongestAgainst
      ? clip(ready.strongestAgainst)
      : null,
    contradictionsOpen: openCons.length,
    evidenceOutstanding: missing.map((item) => item.statement),
    biggestRisk: risks[0]?.title ?? null,
    stillOpen: holes,
    whatWouldChangeIt,
    flipConditions,
    nextMove,
    nextMoveSteps,
    blockers: ready.blockers,
  };
}
