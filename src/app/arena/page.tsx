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

// Ungated. Anonymous visitors receive IndieTerminal already loaded. Signed-in
// users receive their own project. There is no login wall on the floor.
export default async function ArenaPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return (
    <Suspense>
      <ArenaView initialSnapshot={snapshot} />
    </Suspense>
  );
}
