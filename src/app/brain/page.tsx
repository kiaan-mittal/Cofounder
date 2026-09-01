import type { Metadata } from "next";
import { BrainView } from "@/app/brain/brain-view";
import { requireGithubLogin } from "@/server/require-session";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Company Brain",
  description:
    "What this company builds, drawn from its repository and site, split into sourced facts and the assumptions it is betting on without proof.",
  robots: { index: false, follow: false },
};

export default async function BrainPage() {
  await requireGithubLogin("/brain");
  const snapshot = await loadWorkspaceSnapshot();
  return <BrainView initialSnapshot={snapshot} />;
}
