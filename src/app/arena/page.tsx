import { Suspense } from "react";

import { ArenaView } from "@/app/arena/arena-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function ArenaPage() {
  await requireGithubLogin("/arena");
  const snapshot = await loadWorkspaceSnapshot();
  return (
    <Suspense>
      <ArenaView initialSnapshot={snapshot} />
    </Suspense>
  );
}
