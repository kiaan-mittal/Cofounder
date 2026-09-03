import type { Metadata } from "next";
import { HistoryView } from "@/app/history/history-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Past decisions",
  description:
    "Every decision this company has put through Dissent, what was committed, and how the predictions attached to it scored.",
};

export default async function HistoryPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <HistoryView initialSnapshot={snapshot} />;
}
