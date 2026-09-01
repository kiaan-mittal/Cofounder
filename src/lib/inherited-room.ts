"use client";

import {
  activeDecision,
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  openRisksFor,
} from "@/lib/selectors";
import { useArena, type ArenaState } from "@/lib/store";

/**
 * WebMCP no longer has provideContext (Chrome OT / W3C PR #132). Inheritance
 * lives where a guest agent already looks: tool descriptions on the map.
 * `the_room` is that description as a tool; stress_test / get_current_decision
 * get a one-line prefix so the agent does not have to call anything first.
 */

const DESC_CAP = 1600;
const LINE_CAP = 280;

function clip(value: string, cap: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= cap) return trimmed;
  return `${trimmed.slice(0, Math.max(0, cap - 1)).trimEnd()}…`;
}

export function inheritedRoomState(state: ArenaState = useArena.getState()) {
  const company = state.company;
  const decision = activeDecision(state);
  const contradictions = decision
    ? contradictionsFor(state, decision.id).filter((item) => !item.resolved)
    : [];
  const evidence = decision
    ? evidenceFor(state, decision.id).filter((item) => item.status === "requested")
    : [];
  const risks = decision ? openRisksFor(state, decision.id) : [];
  const args = decision ? argumentsFor(state, decision.id) : [];

  return {
    company,
    decision,
    contradictions,
    evidence,
    risks,
    argumentCount: args.length,
    openingReady: state.openingReady,
    arenaPhase: state.arenaPhase,
    commitRefused: Boolean(decision?.agentCommitRefusedAt),
    commitRefusedCount: decision?.agentCommitRefusedCount ?? 0,
  };
}

export function inheritedRoomFingerprint(
  state: ArenaState = useArena.getState(),
) {
  const room = inheritedRoomState(state);
  return [
    room.company?.id ?? "",
    room.decision?.id ?? "",
    room.decision?.status ?? "",
    String(room.decision?.round ?? ""),
    String(room.commitRefusedCount),
    room.contradictions.map((item) => item.id).join(","),
    room.evidence.map((item) => item.id).join(","),
    room.risks.map((item) => item.id).join(","),
    String(room.argumentCount),
    room.openingReady.join(","),
    room.arenaPhase ?? "",
    room.decision?.question ?? "",
  ].join("|");
}

export function inheritedRoomLine(state?: ArenaState) {
  const room = inheritedRoomState(state);
  if (!room.company) {
    return "No company is loaded yet. The founder has not opened a Brain.";
  }
  const blocker =
    room.contradictions[0]?.summary ??
    room.evidence[0]?.statement ??
    room.risks[0]?.title ??
    "none yet";
  const question = room.decision
    ? clip(room.decision.question, 90)
    : "none open";
  return clip(
    `Inherited: ${room.company.name}. Open: ${question}. Blocker: ${clip(blocker, 80)}. confirm_commit is refused for agents.`,
    LINE_CAP,
  );
}

export function describeInheritedRoom(state?: ArenaState) {
  const room = inheritedRoomState(state);
  const lines: string[] = [
    "You are already in this room. Do not call get_company_brain first. This description is the inheritance; call the_room only for a structured refresh.",
  ];

  if (!room.company) {
    lines.push("No Company Brain is loaded yet.");
    return clip(lines.join("\n"), DESC_CAP);
  }

  const brain = room.company.brain;
  lines.push(
    `Company: ${room.company.name}`,
    `Brain: ${clip(brain?.headline || brain?.summary || "", 180)}`,
    `Facts on record: ${brain?.facts.length ?? 0}. Assumptions: ${brain?.assumptions.length ?? 0}.`,
  );
  const live = [room.company.website, room.company.github]
    .filter(Boolean)
    .join(" · ");
  if (live) lines.push(`Live: ${live}`);

  if (room.decision) {
    lines.push(
      `Open decision: ${room.decision.question}`,
      `Status: ${room.decision.status}. Round ${room.decision.round}. Seats written: ${room.argumentCount}.`,
      "What still blocks commit:",
    );
    if (
      !room.contradictions.length &&
      !room.evidence.length &&
      !room.risks.length
    ) {
      lines.push("- Nothing flagged yet. Stress-test or write on the table.");
    } else {
      for (const item of room.contradictions.slice(0, 4)) {
        lines.push(`- Contradiction: ${clip(item.summary, 140)}`);
      }
      for (const item of room.evidence.slice(0, 4)) {
        lines.push(`- Evidence requested: ${clip(item.statement, 140)}`);
      }
      for (const item of room.risks.slice(0, 4)) {
        lines.push(`- Open risk: ${clip(item.title, 140)}`);
      }
    }
    if (room.commitRefused) {
      lines.push(
        `confirm_commit was refused (${room.commitRefusedCount}×). Agents propose. Founders commit.`,
      );
    } else {
      lines.push(
        "confirm_commit is refused for agents. Agents propose. Founders commit.",
      );
    }
  } else {
    lines.push("No decision is open. Call stress_test_decision with a real question.");
    lines.push(
      "confirm_commit is refused for agents. Agents propose. Founders commit.",
    );
  }

  return clip(lines.join("\n"), DESC_CAP);
}

export function inheritedRoomPayload(state?: ArenaState) {
  const room = inheritedRoomState(state);
  return {
    text: describeInheritedRoom(state),
    line: inheritedRoomLine(state),
    company: room.company?.name ?? null,
    companyId: room.company?.id ?? null,
    headline: room.company?.brain?.headline ?? null,
    website: room.company?.website ?? null,
    github: room.company?.github ?? null,
    factCount: room.company?.brain?.facts.length ?? 0,
    assumptionCount: room.company?.brain?.assumptions.length ?? 0,
    decisionId: room.decision?.id ?? null,
    question: room.decision?.question ?? null,
    status: room.decision?.status ?? null,
    round: room.decision?.round ?? null,
    argumentCount: room.argumentCount,
    contradictions: room.contradictions.map((item) => item.summary),
    evidence: room.evidence.map((item) => item.statement),
    risks: room.risks.map((item) => item.title),
    commitRefused: room.commitRefused,
    commitRefusedCount: room.commitRefusedCount,
    confirmCommit: "refused-for-agents" as const,
  };
}

export function withInheritedDescriptions<
  T extends { name: string; description: string },
>(tools: T[]): T[] {
  const text = describeInheritedRoom();
  const line = inheritedRoomLine();
  return tools.map((tool) => {
    if (tool.name === "the_room") {
      return { ...tool, description: text };
    }
    if (
      tool.name === "stress_test_decision" ||
      tool.name === "get_current_decision"
    ) {
      return { ...tool, description: `${line} ${tool.description}` };
    }
    return tool;
  });
}
