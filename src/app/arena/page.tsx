import { Suspense } from "react";

import { ArenaView } from "@/app/arena/arena-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function ArenaPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return (
    <Suspense>
      <ArenaView initialSnapshot={snapshot} />
    </Suspense>
  );
}
