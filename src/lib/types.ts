/**
 * Decision Arena domain model.
 *
 * The whole product rests on one idea: a decision is *structured state*, not a
 * chat transcript. Every claim, objection, risk, assumption and prediction is a
 * first-class record with provenance, so that both a human and an agent can
 * read it, argue with it, and change it.
 */

export type PerspectiveId =
  | "technical"
  | "product"
  | "gtm"
  | "financial"
  | "contrarian";

/** Who caused a piece of state to exist. Provenance is shown in the UI. */
export type Actor = "founder" | "arena" | "agent";

/** How an agent reached the workspace, for honest labelling in the tool log. */
export type AgentChannel = "browser-agent" | "in-page-agent" | "unknown";

/* ------------------------------------------------------------------ */
/* Company Brain                                                       */
/* ------------------------------------------------------------------ */

export type SourceKind = "website" | "github" | "docs" | "founder" | "inferred";

export interface Provenance {
  kind: SourceKind;
  /** URL or repo path the claim came from. */
  ref?: string;
  /** Verbatim excerpt, so the founder can check the agent's work. */
  quote?: string;
}

/** Something the sources actually say. Quotable. */
export interface Fact {
  id: string;
  statement: string;
  provenance: Provenance;
}

/** Something inferred or believed. Challengeable. Never treated as truth. */
export interface Assumption {
  id: string;
  statement: string;
  /** Why the Arena thinks the founder believes this. */
  rationale: string;
  risk: "low" | "medium" | "high";
  status: "unverified" | "challenged" | "validated" | "invalidated";
  provenance: Provenance;
}

export interface CompanyBrain {
  headline: string;
  summary: string;
  product: {
    name: string;
    description: string;
    features: string[];
    maturity: "prototype" | "alpha" | "beta" | "launched" | "unclear";
    roadmapSignals: string[];
  };
  market: {
    icp: string;
    problems: string[];
    positioning: string;
    alternatives: string[];
    pricing: string | null;
  };
  technical: {
    stack: string[];
    architectureNotes: string;
    repoStructure: string[];
    activitySignals: string[];
  };
  facts: Fact[];
  assumptions: Assumption[];
  openQuestions: string[];
  /** True when a source failed and the brain was built from partial input. */
  degraded: boolean;
  /** Human-readable notes about what could not be read. */
  gaps: string[];
  generatedAt: string;
}

export interface IngestionPageReport {
  url: string;
  title: string;
  role: string;
}

export interface IngestionSourceReport {
  kind: SourceKind;
  url: string;
  ok: boolean;
  /** Plain-language reason, shown to the founder when something fails. */
  detail: string;
  bytes?: number;
  /** Public pages or repo files actually read, so the Brain can show coverage. */
  pages?: IngestionPageReport[];
  files?: string[];
}

export interface Company {
  id: string;
  name: string;
  website: string;
  github: string;
  docsUrl?: string;
  brain: CompanyBrain;
  sources: IngestionSourceReport[];
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Decision                                                            */
/* ------------------------------------------------------------------ */

export type DecisionStatus =
  | "framing"
  | "open"
  | "investigating"
  | "committed"
  | "abandoned";

export interface DecisionOption {
  id: string;
  label: string;
  detail: string;
}

export interface Decision {
  id: string;
  companyId: string;
  question: string;
  context: string;
  options: DecisionOption[];
  status: DecisionStatus;
  /** 0–100. The founder sets theirs; the Arena computes its own. */
  founderConfidence: number;
  agentConfidence: number;
  chosenOptionId?: string;
  commitmentRationale?: string;
  round: number;
  createdAt: string;
  committedAt?: string;
}

export type ArgumentStance = "for" | "against" | "conditional";

export type ArgumentStatus =
  | "standing"
  | "weakened"
  | "reinforced"
  | "conceded"
  | "unresolved";

export interface ArgumentBasis {
  type: "fact" | "assumption" | "pattern" | "inference";
  /** id of the Fact / Assumption / FounderPattern this leans on. */
  ref?: string;
  label: string;
}

export interface Argument {
  id: string;
  decisionId: string;
  perspective: PerspectiveId;
  stance: ArgumentStance;
  /** One sentence. The thing being asserted. */
  claim: string;
  /** The support. Two to four sentences, company-specific. */
  reasoning: string;
  basis: ArgumentBasis[];
  /** 0–100. How much weight the Arena currently gives this argument. */
  strength: number;
  status: ArgumentStatus;
  round: number;
  createdBy: Actor;
  channel?: AgentChannel;
  /** Set when this argument is a direct challenge to another. */
  challengesId?: string;
  createdAt: string;
}

export interface Defense {
  id: string;
  decisionId: string;
  /** Null when the founder is defending the decision as a whole. */
  argumentId: string | null;
  text: string;
  round: number;
  createdAt: string;
}

/** The agent's verdict on a defense. Deliberately not always agreement. */
export interface Reassessment {
  id: string;
  decisionId: string;
  defenseId: string;
  argumentId: string;
  perspective: PerspectiveId;
  verdict: "conceded" | "weakened" | "unmoved" | "reinforced";
  /** What the defense did address. Named explicitly so it feels fair. */
  addressed: string;
  /** What it did not. This is the golden-demo sentence. */
  unaddressed: string;
  strengthDelta: number;
  createdAt: string;
}

export interface Risk {
  id: string;
  decisionId: string;
  title: string;
  detail: string;
  /** 1–5. Multiplied by likelihood for ordering. */
  severity: number;
  likelihood: "low" | "medium" | "high";
  status: "open" | "mitigated" | "accepted";
  perspective: PerspectiveId | null;
  createdBy: Actor;
  channel?: AgentChannel;
  createdAt: string;
}

export interface Evidence {
  id: string;
  decisionId: string;
  /** What is being asked for, or what was supplied. */
  statement: string;
  status: "requested" | "provided" | "unavailable";
  requestedBy: Actor;
  /** Which argument hinges on this evidence. */
  argumentId?: string;
  provenance?: Provenance;
  createdAt: string;
}

export interface Contradiction {
  id: string;
  decisionId: string;
  summary: string;
  /** The two things that cannot both be true. */
  sideA: string;
  sideB: string;
  resolved: boolean;
  resolution?: string;
  createdBy: Actor;
  channel?: AgentChannel;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  decisionId: string;
  text: string;
  owner: string;
  done: boolean;
  createdBy: Actor;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Prediction / Outcome / Calibration                                  */
/* ------------------------------------------------------------------ */

export type PredictionDomain =
  | "growth"
  | "revenue"
  | "timeline"
  | "technical"
  | "retention"
  | "distribution"
  | "other";

export interface Prediction {
  id: string;
  decisionId: string;
  companyId: string;
  /** "100 qualified users within 30 days" */
  statement: string;
  domain: PredictionDomain;
  metric: string;
  expectedValue: number;
  unit: string;
  deadline: string;
  confidence: number;
  status: "pending" | "hit" | "missed" | "partial";
  actualValue?: number;
  evaluatedAt?: string;
  /** expected / actual. > 1 means the founder overestimated. */
  ratio?: number;
  createdBy: Actor;
  channel?: AgentChannel;
  createdAt: string;
}

export interface Outcome {
  id: string;
  decisionId: string;
  result: "succeeded" | "failed" | "mixed" | "too_early";
  summary: string;
  lesson: string;
  recordedAt: string;
}

export interface FounderPattern {
  id: string;
  companyId: string;
  domain: PredictionDomain | "commitment";
  /** "You have overestimated growth in 5 of 6 predictions." */
  insight: string;
  /** 0–100. How much evidence stands behind the pattern. */
  confidence: number;
  /** Average expected/actual ratio, when the pattern is numeric. */
  magnitude?: number;
  sampleSize: number;
  decisionIds: string[];
  detectedAt: string;
}

export interface CalibrationBand {
  domain: PredictionDomain;
  /** 0–100 accuracy score. */
  accuracy: number;
  sampleSize: number;
  meanRatio: number | null;
}

/* ------------------------------------------------------------------ */
/* WebMCP tool traffic                                                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Shared table — ink both sides can leave                             */
/* ------------------------------------------------------------------ */

export interface BoardPoint {
  x: number;
  y: number;
}

export type BoardShape =
  | "circle"
  | "box"
  | "underline"
  | "cross"
  | "check"
  | "arrow"
  | "scribble";

/** The five objects on the Decision Canvas. Nothing else. */
export type CanvasKind =
  | "decision"
  | "claim"
  | "evidence"
  | "risk"
  | "assumption";

export type CanvasLinkKind = "supports" | "counters" | "depends" | "handoff";

export interface CanvasNode {
  id: string;
  decisionId: string;
  kind: CanvasKind;
  text: string;
  x: number;
  y: number;
  author: Actor;
  stance?: "+" | "-" | "~";
  /** Short seat name on the card: Product, GTM, Tech, CFO. */
  seat?: string;
  perspective?: PerspectiveId;
  sourceId?: string;
  channel?: AgentChannel;
  createdAt: string;
}

export interface CanvasLink {
  id: string;
  decisionId: string;
  fromId: string;
  toId: string;
  kind: CanvasLinkKind;
  author: Actor;
  createdAt: string;
}

export interface CanvasHandoff {
  nodeId: string;
  instruction: string;
  status: "open" | "working" | "returned";
  returnedText?: string;
}

export interface BoardMark {
  id: string;
  /** Decision id, or the company id when writing before a round is open. */
  decisionId: string;
  kind: "note" | "stroke" | "drawing";
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  points?: BoardPoint[];
  shape?: BoardShape;
  author: Actor;
  channel?: AgentChannel;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  tool: string;
  args: unknown;
  ok: boolean;
  summary: string;
  channel: AgentChannel;
  durationMs: number;
  at: string;
}
