import { WebMCPView } from "@/app/webmcp/webmcp-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function WebMCPPage() {
  await requireGithubLogin("/webmcp");
  const snapshot = await loadWorkspaceSnapshot();
  return <WebMCPView initialSnapshot={snapshot} />;
}
