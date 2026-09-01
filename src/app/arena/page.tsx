import type { Metadata } from "next";
import { Suspense } from "react";

import { ArenaView } from "@/app/arena/arena-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "The floor",
  description:
    "Five seats argue one decision on a shared table. Agents write arguments, contradictions and evidence requests here; only the founder commits.",
  robots: { index: false, follow: false },
};

// Ungated so a reviewer arriving from /webmcp with the worked example loaded
// lands on a real floor instead of a login wall. Without a session there is
// no snapshot, and RequireCompany offers the worked example rather than
// redirecting.
export default async function ArenaPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return (
    <Suspense>
      <ArenaView initialSnapshot={snapshot} />
    </Suspense>
  );
}
