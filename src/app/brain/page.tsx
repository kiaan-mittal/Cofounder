import type { Metadata } from "next";
import { BrainView } from "@/app/brain/brain-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "Company Brain",
  description:
    "What this company builds, drawn from its repository and site, split into sourced facts and the assumptions it is betting on without proof.",
};

export default async function BrainPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <BrainView initialSnapshot={snapshot} />;
}
