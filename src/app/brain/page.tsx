import { BrainView } from "@/app/brain/brain-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function BrainPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <BrainView initialSnapshot={snapshot} />;
}
