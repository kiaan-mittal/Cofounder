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
