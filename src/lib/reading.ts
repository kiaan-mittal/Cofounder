export type ReadingLine = {
  kind: "heading" | "body" | "commit" | "meta" | "file" | "issue";
  text: string;
};

export type ReadingExcerpt = {
  source: "website" | "github" | "docs";
  title: string;
  url: string;
  lines: ReadingLine[];
};

export type BrainStage = "website" | "github" | "separate" | "assemble";

export type BrainBuildEvent =
  | { type: "stage"; stage: BrainStage }
  | { type: "excerpt"; excerpt: ReadingExcerpt }
  | { type: "done"; company: import("@/lib/types").Company }
  | { type: "error"; message: string; hint?: string };

export type DebateDefendEvent =
  | { type: "started" }
  | {
      type: "partial";
      reassessments: Array<{
        argumentId: string;
        verdict?: import("@/lib/types").Reassessment["verdict"];
        addressed?: string;
        unaddressed?: string;
        reply?: string;
        strengthDelta?: number;
      }>;
    }
  | {
      type: "done";
      round: {
        reassessments: Array<{
          argumentId: string;
          verdict: import("@/lib/types").Reassessment["verdict"];
          addressed: string;
          unaddressed: string;
          reply?: string;
          strengthDelta: number;
        }>;
        newArguments: Array<
          DebateOpeningRound["arguments"][number] & { challengesId?: string }
        >;
        newRisks: DebateOpeningRound["risks"];
        newContradictions: DebateOpeningRound["contradictions"];
        arenaConfidence: number;
        arenaConfidenceRationale: string;
      };
    }
  | { type: "error"; message: string; hint?: string };

export type DebateOpenEvent =
  | { type: "started" }
  | {
      type: "frame";
      frame: Pick<
        DebateOpeningRound,
        | "contextNote"
        | "options"
        | "arenaConfidence"
        | "risks"
        | "contradictions"
        | "evidenceRequests"
      >;
    }
  | {
      type: "perspective";
      perspective: import("@/lib/types").PerspectiveId;
      argument?: DebateOpeningRound["arguments"][number];
    }
  | { type: "done"; round: DebateOpeningRound }
  | { type: "error"; message: string; hint?: string };

export type SparringPlan = {
  reasoning: string;
  action: "call_tool" | "respond";
  tool: string | null;
  argsJson: string | null;
  message: string | null;
};

export type SparringPlanEvent =
  | { type: "partial"; reasoning?: string; message?: string }
  | { type: "done"; step: SparringPlan }
  | { type: "error"; message: string };

export interface DebateOpeningRound {
  contextNote: string;
  options: Array<{ label: string; detail: string }>;
  arenaConfidence: number;
  arguments: Array<{
    perspective: import("@/lib/types").PerspectiveId;
    stance: import("@/lib/types").ArgumentStance;
    claim: string;
    reasoning: string;
    basis: Array<{ type: string; ref?: string; label: string }>;
    strength: number;
  }>;
  risks: Array<{
    title: string;
    detail: string;
    severity: number;
    likelihood: "low" | "medium" | "high";
    perspective: import("@/lib/types").PerspectiveId | null;
  }>;
  contradictions: Array<{ summary: string; sideA: string; sideB: string }>;
  evidenceRequests: string[];
}
