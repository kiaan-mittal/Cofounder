import type { Metadata } from "next";
import { Suspense } from "react";

import { ArenaView } from "@/app/arena/arena-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";
import { readWatch } from "@/server/watches";

export const metadata: Metadata = {
  title: "The floor",
  description:
    "Five seats argue one decision on a shared table. Agents write arguments, contradictions and evidence requests here; only the founder commits.",
  robots: { index: false, follow: false },
};

// Ungated. Anonymous visitors receive IndieTerminal already loaded. Signed-in
// users receive their own project. There is no login wall on the floor.
export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ watch?: string }>;
}) {
  const snapshot = await loadWorkspaceSnapshot();
  const params = await searchParams;
  const watchToken = params.watch ?? null;
  const watchSnapshot =
    watchToken?.startsWith("wch_") ? await readWatch(watchToken) : null;
  return (
    <Suspense>
      <ArenaView
        initialSnapshot={snapshot}
        watchToken={watchToken}
        watchSnapshot={watchSnapshot}
      />
    </Suspense>
  );
}
