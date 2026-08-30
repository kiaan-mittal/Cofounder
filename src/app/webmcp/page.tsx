import { WebMCPView } from "@/app/webmcp/webmcp-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function WebMCPPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <WebMCPView initialSnapshot={snapshot} />;
}
