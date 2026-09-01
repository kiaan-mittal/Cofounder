/**
 * Two workspaces exist only in the page, never as someone's account:
 *
 * - IndieTerminal (`SHOWCASE_COMPANY_ID`) — the public judging floor. A real
 *   company, loaded from public sources, so a reviewer on Vercel sees a loaded
 *   room without signing into the founder's GitHub account.
 * - Kettle (`DEMO_COMPANY_ID`) — the fictional calibration sample behind
 *   `?demo=1`. Not the judging path.
 *
 * Neither may be written into a signed-in user's Supabase project.
 */
export const DEMO_COMPANY_ID = "co_worked_example";
export const SHOWCASE_COMPANY_ID = "co_indieterminal";

/** YC Startup School Bangalore lives in kiaan-mittal/ycblr, not this product. */
const FOREIGN_ARENA =
  /startup school bangalore|founder directory for yc|\bycblr\b/i;

type DecisionLike = { id?: string; question?: string; decisionId?: string };

function keyedByDecision<T>(list: T[] | undefined, drop: Set<string>) {
  if (!list?.length || !drop.size) return list;
  return list.filter((item) => {
    const id = (item as DecisionLike).decisionId;
    return !id || !drop.has(id);
  });
}

/**
 * Drop arenas that belong to another repo. Safe on any snapshot so a leftover
 * Bangalore round cannot sit on the IndieTerminal floor.
 */
export function withoutForeignArenas<T extends Record<string, unknown>>(
  snapshot: T,
): T {
  const decisions = Array.isArray(snapshot.decisions)
    ? (snapshot.decisions as DecisionLike[])
    : [];
  const drop = new Set(
    decisions
      .filter((decision) => FOREIGN_ARENA.test(decision.question ?? ""))
      .map((decision) => decision.id)
      .filter((id): id is string => Boolean(id)),
  );
  if (!drop.size) return snapshot;

  const nextActive =
    typeof snapshot.activeDecisionId === "string" &&
    drop.has(snapshot.activeDecisionId)
      ? (decisions.find((decision) => decision.id && !drop.has(decision.id))
          ?.id ?? null)
      : snapshot.activeDecisionId;

  return {
    ...snapshot,
    decisions: decisions.filter(
      (decision) => decision.id && !drop.has(decision.id),
    ),
    argumentList: keyedByDecision(
      snapshot.argumentList as DecisionLike[] | undefined,
      drop,
    ),
    defenses: keyedByDecision(
      snapshot.defenses as DecisionLike[] | undefined,
      drop,
    ),
    reassessments: keyedByDecision(
      snapshot.reassessments as DecisionLike[] | undefined,
      drop,
    ),
    risks: keyedByDecision(snapshot.risks as DecisionLike[] | undefined, drop),
    evidence: keyedByDecision(
      snapshot.evidence as DecisionLike[] | undefined,
      drop,
    ),
    contradictions: keyedByDecision(
      snapshot.contradictions as DecisionLike[] | undefined,
      drop,
    ),
    actionItems: keyedByDecision(
      snapshot.actionItems as DecisionLike[] | undefined,
      drop,
    ),
    predictions: keyedByDecision(
      snapshot.predictions as DecisionLike[] | undefined,
      drop,
    ),
    outcomes: keyedByDecision(
      snapshot.outcomes as DecisionLike[] | undefined,
      drop,
    ),
    boardMarks: keyedByDecision(
      snapshot.boardMarks as DecisionLike[] | undefined,
      drop,
    ),
    canvasNodes: keyedByDecision(
      snapshot.canvasNodes as DecisionLike[] | undefined,
      drop,
    ),
    activeDecisionId: nextActive,
  };
}

type SnapshotLike = {
  company?: { id?: string } | null;
} | null | undefined;

export function isEphemeralCompanyId(id: string | null | undefined) {
  return id === SHOWCASE_COMPANY_ID || id === DEMO_COMPANY_ID;
}

export function companyIdOf(snapshot: SnapshotLike) {
  return snapshot?.company?.id ?? null;
}

export function isEphemeralSnapshot(snapshot: SnapshotLike) {
  return isEphemeralCompanyId(companyIdOf(snapshot));
}

export function isShowcaseSnapshot(snapshot: SnapshotLike) {
  return companyIdOf(snapshot) === SHOWCASE_COMPANY_ID;
}

export function isDemoSnapshot(snapshot: SnapshotLike) {
  return companyIdOf(snapshot) === DEMO_COMPANY_ID;
}
