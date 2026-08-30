import type { PerspectiveId } from "@/lib/types";

export interface PerspectiveMeta {
  id: PerspectiveId;
  /** The seat at the table. */
  name: string;
  /** One line the founder reads before the argument. */
  remit: string;
  focus: string[];
  /** Two-letter mark used in the margin next to an argument. */
  mark: string;
}

export const PERSPECTIVES: PerspectiveMeta[] = [
  {
    id: "technical",
    name: "Technical Co-Founder",
    remit: "Argues about what it will actually cost to build and maintain.",
    focus: [
      "architecture",
      "technical debt",
      "engineering effort",
      "implementation risk",
      "opportunity cost",
    ],
    mark: "TE",
  },
  {
    id: "product",
    name: "Product Co-Founder",
    remit: "Argues about whether users will feel the difference.",
    focus: [
      "user value",
      "roadmap",
      "prioritisation",
      "experience",
      "product quality",
    ],
    mark: "PR",
  },
  {
    id: "gtm",
    name: "GTM Co-Founder",
    remit: "Argues about whether anyone will ever hear about it.",
    focus: [
      "distribution",
      "acquisition",
      "positioning",
      "sales motion",
      "market demand",
    ],
    mark: "GT",
  },
  {
    id: "financial",
    name: "Financial Co-Founder",
    remit: "Argues about what this costs you in money and in time.",
    focus: ["revenue", "costs", "runway", "unit economics", "expected value"],
    mark: "FI",
  },
  {
    id: "contrarian",
    name: "The Contrarian",
    remit: "Argues the strongest case that you are simply wrong.",
    focus: [
      "hidden assumptions",
      "failure modes",
      "contradictions",
      "alternative explanations",
      "uncomfortable possibilities",
    ],
    mark: "CO",
  },
];

export const PERSPECTIVE_MAP: Record<PerspectiveId, PerspectiveMeta> =
  Object.fromEntries(PERSPECTIVES.map((p) => [p.id, p])) as Record<
    PerspectiveId,
    PerspectiveMeta
  >;

export function perspectiveName(perspectiveId: PerspectiveId): string {
  return PERSPECTIVE_MAP[perspectiveId]?.name ?? perspectiveId;
}
