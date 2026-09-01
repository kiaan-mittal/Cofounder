import type { Metadata } from "next";
import { HistoryView } from "@/app/history/history-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Past decisions",
  description:
    "Every decision this company has put through the Arena, what was committed, and how the predictions attached to it scored.",
  robots: { index: false, follow: false },
};

export default async function HistoryPage() {
  await requireGithubLogin("/history");
  const snapshot = await loadWorkspaceSnapshot();
  return <HistoryView initialSnapshot={snapshot} />;
}
