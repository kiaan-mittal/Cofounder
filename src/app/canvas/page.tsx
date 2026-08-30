import { CanvasView } from "@/app/canvas/canvas-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function CanvasPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <CanvasView initialSnapshot={snapshot} />;
}
