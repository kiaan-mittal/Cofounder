import { CanvasView } from "@/app/canvas/canvas-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function CanvasPage() {
  await requireGithubLogin("/canvas");
  const snapshot = await loadWorkspaceSnapshot();
  return <CanvasView initialSnapshot={snapshot} />;
}
