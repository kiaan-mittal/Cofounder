import { calibrationBands } from "@/lib/calibration";
import { PERSPECTIVE_MAP, perspectiveSeat } from "@/lib/perspectives";
import type { ArenaState } from "@/lib/store";
import type { Argument, Decision, Reassessment } from "@/lib/types";

export type StillOpenItem = {
  id: string;
  seat: string;
  text: string;
};

/**
 * Latest non-conceded hole per argument and seat. Derived from reassessments
 * so the right panel can show what is still unpaid without duplicating it
 * into Risk or Contradiction records.
 */
export function stillOpenFrom(reassessments: Reassessment[]): StillOpenItem[] {
  const latest = new Map<string, Reassessment>();
  for (const item of reassessments) {
    if (item.streaming) continue;
    const key = `${item.argumentId}:${item.perspective}`;
    const prev = latest.get(key);
    if (!prev || item.createdAt >= prev.createdAt) latest.set(key, item);
  }

  return [...latest.values()]
    .filter(
      (item) =>
        item.verdict !== "conceded" && Boolean(item.unaddressed?.trim()),
    )
    .map((item) => ({
      id: item.id,
      seat: perspectiveSeat(item.perspective),
      text: item.unaddressed.trim(),
    }));
}

/**
 * One read layer for two consumers.
 *
 * Everything the founder sees on screen and everything an agent reads through
 * WebMCP comes from these functions. That is the point: there is no separate
 * "agent view" of the workspace that can drift from the human one.
 */

export function activeDecision(state: ArenaState): Decision | null {
  if (state.listingArenas || !state.activeDecisionId) return null;
  return state.decisions.find((d) => d.id === state.activeDecisionId) ?? null;
}

export function argumentsFor(
  state: ArenaState,
  decisionId: string,
): Argument[] {
  return state.argumentList
    .filter((a) => a.decisionId === decisionId)
    .sort((a, b) => b.strength - a.strength);
}

export function risksFor(state: ArenaState, decisionId: string) {
  return state.risks
    .filter((r) => r.decisionId === decisionId)
    .sort((a, b) => b.severity - a.severity);
}

export function openRisksFor(state: ArenaState, decisionId: string) {
  return risksFor(state, decisionId).filter((r) => r.status === "open");
}

export function evidenceFor(state: ArenaState, decisionId: string) {
  return state.evidence.filter((e) => e.decisionId === decisionId);
}

export function contradictionsFor(state: ArenaState, decisionId: string) {
  return state.contradictions.filter((c) => c.decisionId === decisionId);
}

export function defensesFor(state: ArenaState, decisionId: string) {
  return state.defenses.filter((d) => d.decisionId === decisionId);
}

export function reassessmentsFor(state: ArenaState, decisionId: string) {
  return state.reassessments.filter((r) => r.decisionId === decisionId);
}

export function actionItemsFor(state: ArenaState, decisionId: string) {
  return state.actionItems.filter((a) => a.decisionId === decisionId);
}

export function predictionsFor(state: ArenaState, decisionId: string) {
  return state.predictions.filter((p) => p.decisionId === decisionId);
}

/**
 * The serialisable picture of a decision. This exact shape is what the
 * `get_current_decision` WebMCP tool hands to an agent.
 */
export function decisionSnapshot(state: ArenaState, decisionId: string) {
  const decision = state.decisions.find((d) => d.id === decisionId);
  if (!decision) return null;

  const args = argumentsFor(state, decisionId);
  const defenses = defensesFor(state, decisionId);
  const reassessments = reassessmentsFor(state, decisionId);

  return {
    id: decision.id,
    question: decision.question,
    context: decision.context,
    status: decision.status,
    round: decision.round,
    options: decision.options,
    confidence: {
      founder: decision.founderConfidence,
      arena: decision.agentConfidence,
      /** A gap worth arguing about is the most useful signal here. */
      gap: decision.founderConfidence - decision.agentConfidence,
    },
    arguments: args.map((a) => ({
      id: a.id,
      perspective: a.perspective,
      perspectiveName: PERSPECTIVE_MAP[a.perspective]?.name ?? a.perspective,
      seat: perspectiveSeat(a.perspective),
      stance: a.stance,
      claim: a.claim,
      reasoning: a.reasoning,
      strength: a.strength,
      status: a.status,
      basis: a.basis,
      round: a.round,
      createdBy: a.createdBy,
      challengesId: a.challengesId ?? null,
    })),
    founderDefenses: defenses.map((d) => ({
      id: d.id,
      respondsToArgumentId: d.argumentId,
      text: d.text,
      round: d.round,
      createdAt: d.createdAt,
    })),
    reassessments: reassessments.map((r) => ({
      id: r.id,
      defenseId: r.defenseId,
      argumentId: r.argumentId,
      perspective: r.perspective,
      perspectiveName: PERSPECTIVE_MAP[r.perspective]?.name ?? r.perspective,
      seat: perspectiveSeat(r.perspective),
      verdict: r.verdict,
      addressed: r.addressed,
      unaddressed: r.unaddressed,
      reply: r.reply ?? null,
      strengthDelta: r.strengthDelta,
      streaming: Boolean(r.streaming),
      createdAt: r.createdAt,
    })),
    stillOpen: stillOpenFrom(reassessments),
    pendingCommit:
      state.pendingCommit?.decisionId === decisionId
        ? {
            optionId: state.pendingCommit.optionId,
            optionLabel: state.pendingCommit.optionLabel,
            rationale: state.pendingCommit.rationale,
            proposedBy: state.pendingCommit.proposedBy,
          }
        : null,
    risks: risksFor(state, decisionId).map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      severity: r.severity,
      likelihood: r.likelihood,
      status: r.status,
      perspective: r.perspective,
      createdBy: r.createdBy,
    })),
    evidence: evidenceFor(state, decisionId).map((e) => ({
      id: e.id,
      statement: e.statement,
      status: e.status,
      argumentId: e.argumentId ?? null,
      requestedBy: e.requestedBy,
    })),
    contradictions: contradictionsFor(state, decisionId).map((c) => ({
      id: c.id,
      summary: c.summary,
      sideA: c.sideA,
      sideB: c.sideB,
      resolved: c.resolved,
      resolution: c.resolution ?? null,
    })),
    actionItems: actionItemsFor(state, decisionId).map((a) => ({
      id: a.id,
      text: a.text,
      owner: a.owner,
      done: a.done,
    })),
    predictions: predictionsFor(state, decisionId).map((p) => ({
      id: p.id,
      statement: p.statement,
      expectedValue: p.expectedValue,
      unit: p.unit,
      deadline: p.deadline,
      status: p.status,
      actualValue: p.actualValue ?? null,
    })),
  };
}

export function decisionHistory(state: ArenaState, includeRecord = false) {
  return state.decisions.map((decision) => {
    const outcome = state.outcomes.find((o) => o.decisionId === decision.id);
    const predictions = predictionsFor(state, decision.id);
    const args = argumentsFor(state, decision.id);
    const defenses = defensesFor(state, decision.id);
    const reassessments = reassessmentsFor(state, decision.id);
    const openings = args.filter((a) => !a.challengesId);
    return {
      id: decision.id,
      question: decision.question,
      status: decision.status,
      founderConfidence: decision.founderConfidence,
      arenaConfidence: decision.agentConfidence,
      committedAt: decision.committedAt ?? null,
      createdAt: decision.createdAt,
      chosenOption:
        decision.options.find((o) => o.id === decision.chosenOptionId)?.label ??
        null,
      commitmentRationale: decision.commitmentRationale ?? null,
      floor: {
        arguments: args.length,
        defenses: defenses.length,
        replies: reassessments.filter((r) => Boolean(r.reply?.trim())).length,
        seats: openings.map((a) => ({
          id: a.id,
          seat: perspectiveSeat(a.perspective),
          perspective: a.perspective,
          stance: a.stance,
          claim: a.claim,
        })),
      },
      outcome: outcome
        ? { result: outcome.result, summary: outcome.summary, lesson: outcome.lesson }
        : null,
      predictions: predictions.map((p) => ({
        statement: p.statement,
        domain: p.domain,
        expectedValue: p.expectedValue,
        actualValue: p.actualValue ?? null,
        unit: p.unit,
        status: p.status,
        ratio: p.ratio ?? null,
      })),
      ...(includeRecord
        ? { record: decisionSnapshot(state, decision.id) }
        : {}),
    };
  });
}

export function calibrationSnapshot(state: ArenaState) {
  const bands = calibrationBands(state.predictions);
  const evaluatedCount = state.predictions.filter(
    (p) => p.status !== "pending",
  ).length;
  return {
    bands,
    patterns: state.patterns.map((p) => ({
      domain: p.domain,
      insight: p.insight,
      confidence: p.confidence,
      magnitude: p.magnitude ?? null,
      sampleSize: p.sampleSize,
    })),
    predictionsRecorded: state.predictions.length,
    predictionsEvaluated: evaluatedCount,
    /** Below three evaluated outcomes the profile is not yet trustworthy. */
    reliable: evaluatedCount >= 3,
  };
}

/** Ranked material for the Decision Ready summary. */
export function readiness(state: ArenaState, decisionId: string) {
  const args = argumentsFor(state, decisionId);
  const live = args.filter((a) => a.status !== "conceded");
  const strongestFor =
    live.filter((a) => a.stance === "for").sort(byStrength)[0] ?? null;
  const strongestAgainst =
    live.filter((a) => a.stance === "against").sort(byStrength)[0] ?? null;
  const openRisks = openRisksFor(state, decisionId);
  const unresolvedContradictions = contradictionsFor(state, decisionId).filter(
    (c) => !c.resolved,
  );
  const missingEvidence = evidenceFor(state, decisionId).filter(
    (e) => e.status === "requested",
  );

  const company = state.company;
  const riskiestAssumption =
    company?.brain.assumptions
      .filter((a) => a.status !== "invalidated")
      .sort((a, b) => riskScore(b.risk) - riskScore(a.risk))[0] ?? null;

  return {
    strongestFor,
    strongestAgainst,
    biggestRisk: openRisks[0] ?? null,
    openRiskCount: openRisks.length,
    unresolvedContradictions,
    missingEvidence,
    riskiestAssumption,
    /** Commitment is blocked while the agent still has an unanswered objection. */
    blockers: [
      ...unresolvedContradictions.map(
        (c) => `Unresolved contradiction: ${c.summary}`,
      ),
      ...missingEvidence.map((e) => `Evidence still requested: ${e.statement}`),
    ],
  };
}

function byStrength(a: Argument, b: Argument) {
  return b.strength - a.strength;
}

function riskScore(risk: "low" | "medium" | "high") {
  return risk === "high" ? 3 : risk === "medium" ? 2 : 1;
}
