import type {
  ActionItem,
  Argument,
  Contradiction,
  Decision,
  Defense,
  Evidence,
  PerspectiveId,
  Reassessment,
  Risk,
} from "@/lib/types";

export type WatchSnapshot = {
  companyName: string;
  companyId: string;
  decision: Decision;
  arenaPhase: null | "opening";
  openingReady: PerspectiveId[];
  arguments: Argument[];
  defenses: Defense[];
  reassessments: Reassessment[];
  risks: Risk[];
  evidence: Evidence[];
  contradictions: Contradiction[];
  actionItems: ActionItem[];
  commitRefused: boolean;
  agentTool: { name: string; summary: string; at: string } | null;
  updatedAt: string;
};

export function isWatchSnapshot(value: unknown): value is WatchSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const decision = record.decision;
  return (
    typeof record.companyName === "string" &&
    Boolean(decision) &&
    typeof decision === "object" &&
    typeof (decision as Decision).question === "string" &&
    Array.isArray(record.arguments)
  );
}
