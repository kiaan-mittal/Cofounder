"use client";

import { now } from "@/lib/id";
import {
  actionItemsFor,
  activeDecision,
  argumentsFor,
  contradictionsFor,
  defensesFor,
  evidenceFor,
  reassessmentsFor,
  risksFor,
} from "@/lib/selectors";
import type { ArenaState } from "@/lib/store";
import type { AgentChannel } from "@/lib/types";
import type { WatchSnapshot } from "@/lib/watch-snapshot";

const AGENT: Set<AgentChannel> = new Set(["browser-agent", "in-page-agent"]);

export function watchSnapshotFromStore(state: ArenaState): WatchSnapshot | null {
  const decision = activeDecision(state);
  if (!decision) return null;
  const latest = state.toolCalls[0];
  const agentTool =
    latest && AGENT.has(latest.channel)
      ? { name: latest.tool, summary: latest.summary, at: latest.at }
      : null;

  return {
    companyName: state.company?.name ?? "",
    companyId: state.company?.id ?? "",
    decision,
    arenaPhase: state.arenaPhase,
    openingReady: state.openingReady,
    arguments: argumentsFor(state, decision.id),
    defenses: defensesFor(state, decision.id),
    reassessments: reassessmentsFor(state, decision.id),
    risks: risksFor(state, decision.id),
    evidence: evidenceFor(state, decision.id),
    contradictions: contradictionsFor(state, decision.id),
    actionItems: actionItemsFor(state, decision.id),
    commitRefused: Boolean(decision.agentCommitRefusedAt),
    agentTool,
    updatedAt: now(),
  };
}

export function watchFingerprint(state: ArenaState) {
  const snap = watchSnapshotFromStore(state);
  if (!snap) return "";
  return [
    snap.decision.id,
    snap.arenaPhase ?? "",
    snap.openingReady.join(","),
    snap.arguments
      .map((item) => `${item.id}:${item.claim.length}:${item.reasoning.length}`)
      .join(","),
    String(snap.defenses.length),
    snap.reassessments
      .map(
        (item) =>
          `${item.id}:${item.streaming ? 1 : 0}:${item.reply?.length ?? 0}`,
      )
      .join(","),
    String(snap.contradictions.length),
    String(snap.evidence.length),
    String(snap.risks.length),
    snap.commitRefused ? "1" : "0",
    snap.agentTool?.at ?? "",
  ].join("|");
}
