import type { PerspectiveId } from "@/lib/types";

export interface PerspectiveMeta {
  id: PerspectiveId;
  /** The seat at the table. */
  name: string;
  /** One line the founder reads before the argument. */
  remit: string;
  focus: string[];
  /** Short form for tight chrome: TECH, PRODUCT, GTM, CFO, CONTRA. */
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
    mark: "TECH",
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
    mark: "PRODUCT",
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
    mark: "GTM",
  },
  {
    id: "financial",
    name: "Financial Co-Founder",
    remit: "Argues about what this costs you in money and in time.",
    focus: ["revenue", "costs", "runway", "unit economics", "expected value"],
    mark: "CFO",
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
    mark: "CONTRA",
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

/** Short form for keys and canvas chips. */
export function perspectiveSeat(perspectiveId: PerspectiveId): string {
  return PERSPECTIVE_MAP[perspectiveId]?.mark ?? perspectiveId;
}

export function seatToPerspective(seat?: string): PerspectiveId | null {
  if (!seat) return null;
  const key = seat.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (
    key === "tech" ||
    key === "technical" ||
    key === "technical co founder" ||
    key === "technical cofounder"
  ) {
    return "technical";
  }
  if (
    key === "product" ||
    key === "product co founder" ||
    key === "product cofounder"
  ) {
    return "product";
  }
  if (key === "gtm" || key === "gtm co founder" || key === "gtm cofounder") {
    return "gtm";
  }
  if (
    key === "cfo" ||
    key === "fi" ||
    key === "finance" ||
    key === "money" ||
    key === "financial" ||
    key === "financial co founder" ||
    key === "financial cofounder"
  ) {
    return "financial";
  }
  if (key === "contra" || key === "contrarian" || key === "the contrarian") {
    return "contrarian";
  }
  return null;
}
