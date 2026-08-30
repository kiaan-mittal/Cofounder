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

export type DebateOpenEvent =
  | { type: "started" }
  | { type: "perspective"; perspective: import("@/lib/types").PerspectiveId }
  | { type: "done"; round: DebateOpeningRound }
  | { type: "error"; message: string; hint?: string };

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
