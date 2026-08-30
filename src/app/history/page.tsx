import { HistoryView } from "@/app/history/history-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export default async function HistoryPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <HistoryView initialSnapshot={snapshot} />;
}
