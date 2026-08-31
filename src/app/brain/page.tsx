import { BrainView } from "@/app/brain/brain-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function BrainPage() {
  await requireGithubLogin("/brain");
  const snapshot = await loadWorkspaceSnapshot();
  return <BrainView initialSnapshot={snapshot} />;
}
