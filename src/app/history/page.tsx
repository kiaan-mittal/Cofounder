import { HistoryView } from "@/app/history/history-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function HistoryPage() {
  await requireGithubLogin("/history");
  const snapshot = await loadWorkspaceSnapshot();
  return <HistoryView initialSnapshot={snapshot} />;
}
