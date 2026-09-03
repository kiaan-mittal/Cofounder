import { arenaVerdict } from "@/lib/arena-verdict";
import { PERSPECTIVE_MAP, perspectiveSeat } from "@/lib/perspectives";
import {
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  openRisksFor,
} from "@/lib/selectors";
import type { ArenaState } from "@/lib/store";

/**
 * A portable decision record. Small enough to leave the page — a share
 * link, a Slack post, a Notion page — without dragging the whole workspace.
 */

export type DecisionBrief = {
  company: string;
  question: string;
  context: string;
  status: string;
  leaning: string;
  leaningLabel: string;
  deadlock: boolean;
  deadlockNote: string | null;
  arenaConfidence: number;
  founderConfidence: number;
  seats: Array<{
    seat: string;
    name: string;
    stance: string;
    claim: string;
    reasoning: string;
    risk: string;
    reversibility: string;
    strength: number;
  }>;
  contradictions: Array<{ summary: string; sideA: string; sideB: string }>;
  evidence: string[];
  risks: Array<{ title: string; detail: string }>;
  whatWouldChangeIt: string;
  flipConditions: string[];
  nextMove: string | null;
  nextMoveSteps: string[];
  createdAt: string;
  /** Present when an agent called confirm_commit and was refused. */
  commitRefused?: boolean;
  commitRefusedAt?: string;
  commitRefusedCount?: number;
};

export function briefFromState(
  state: ArenaState,
  decisionId: string,
): DecisionBrief | null {
  const decision = state.decisions.find((item) => item.id === decisionId);
  if (!decision) return null;
  const verdict = arenaVerdict(state, decisionId);
  const openings = argumentsFor(state, decisionId).filter(
    (item) => !item.challengesId,
  );

  return {
    company: state.company?.name ?? "Dissent",
    question: decision.question,
    context: decision.context,
    status: decision.status,
    leaning: verdict?.leaning ?? "too-early",
    leaningLabel: verdict?.leaningLabel ?? "The seats have not finished writing.",
    deadlock: Boolean(verdict?.deadlock),
    deadlockNote: verdict?.deadlockNote ?? null,
    arenaConfidence: decision.agentConfidence,
    founderConfidence: decision.founderConfidence,
    seats: openings.map((item) => ({
      seat: perspectiveSeat(item.perspective),
      name: PERSPECTIVE_MAP[item.perspective]?.name ?? item.perspective,
      stance: item.stance,
      claim: item.claim,
      reasoning: item.basis[0]?.label ?? item.reasoning,
      risk: item.riskLevel ?? "medium",
      reversibility: item.reversibility ?? "medium",
      strength: item.strength,
    })),
    contradictions: contradictionsFor(state, decisionId)
      .filter((item) => !item.resolved)
      .map((item) => ({
        summary: item.summary,
        sideA: item.sideA,
        sideB: item.sideB,
      })),
    evidence: evidenceFor(state, decisionId)
      .filter((item) => item.status === "requested")
      .map((item) => item.statement),
    risks: openRisksFor(state, decisionId).map((item) => ({
      title: item.title,
      detail: item.detail,
    })),
    whatWouldChangeIt: verdict?.whatWouldChangeIt ?? "A number and a date.",
    flipConditions: verdict?.flipConditions ?? [],
    nextMove: verdict?.nextMove ?? null,
    nextMoveSteps: verdict?.nextMoveSteps ?? [],
    createdAt: new Date().toISOString(),
    commitRefused: Boolean(decision.agentCommitRefusedAt),
    commitRefusedAt: decision.agentCommitRefusedAt,
    commitRefusedCount: decision.agentCommitRefusedCount,
  };
}

export function briefToMarkdown(brief: DecisionBrief, shareUrl?: string): string {
  const seats = brief.seats
    .map(
      (seat) =>
        `### ${seat.seat} · ${seat.stance.toUpperCase()} · ${seat.strength}/100\n**${seat.claim}**\nEvidence: ${seat.reasoning} · Risk: ${seat.risk} · Undo: ${seat.reversibility}`,
    )
    .join("\n\n");
  const contradictions = brief.contradictions.length
    ? brief.contradictions
        .map((item) => `- **${item.summary}** — ${item.sideA} / ${item.sideB}`)
        .join("\n")
    : "_None open._";
  const evidence = brief.evidence.length
    ? brief.evidence.map((item) => `- ${item}`).join("\n")
    : "_None outstanding._";
  const risks = brief.risks.length
    ? brief.risks.map((item) => `- **${item.title}** — ${item.detail}`).join("\n")
    : "_None open._";

  return [
    `# ${brief.question}`,
    "",
    `${brief.company} · ${brief.status} · Floor ${brief.arenaConfidence}% · Founder ${brief.founderConfidence}%`,
    "",
    brief.deadlock
      ? `**Deadlock.** ${brief.deadlockNote ?? brief.leaningLabel}`
      : `**${brief.leaningLabel}**`,
    "",
    brief.context ? `_${brief.context}_\n` : "",
    "## Seats",
    "",
    seats || "_The seats have not written yet._",
    "",
    "## Still open",
    "",
    `What would change the call: ${brief.whatWouldChangeIt}`,
    brief.flipConditions.length
      ? brief.flipConditions.map((item) => `- ${item}`).join("\n")
      : "",
    brief.nextMove ? `\n**Next move:** ${brief.nextMove}` : "",
    brief.nextMoveSteps.length
      ? brief.nextMoveSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")
      : "",
    "",
    "### Contradictions",
    contradictions,
    "",
    "### Evidence requested",
    evidence,
    "",
    "### Risks",
    risks,
    "",
    shareUrl ? `Live record: ${shareUrl}` : "",
    "",
    brief.commitRefused
      ? "**Waiting for founder confirmation.** ChatGPT proposed. The founder commits. Exported from Dissent."
      : "_ChatGPT proposed. The founder commits. Exported from Dissent._",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function isDecisionBrief(value: unknown): value is DecisionBrief {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.question === "string" &&
    typeof record.company === "string" &&
    Array.isArray(record.seats)
  );
}
