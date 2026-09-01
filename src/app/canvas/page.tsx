import type { Metadata } from "next";
import { CanvasView } from "@/app/canvas/canvas-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Decision canvas",
  description:
    "The living model of a decision: claims, evidence, risks and assumptions, and the links between them.",
  robots: { index: false, follow: false },
};

export default async function CanvasPage() {
  await requireGithubLogin("/canvas");
  const snapshot = await loadWorkspaceSnapshot();
  return <CanvasView initialSnapshot={snapshot} />;
}
