import type { Metadata } from "next";
import { WebMCPView } from "@/app/webmcp/webmcp-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "The guest protocol",
  description:
    "The rules an AI agent plays by inside Decision Arena: the tools it can call, the objects it writes on the shared table, and the one act it is never allowed to perform.",
};

// Deliberately ungated. Anonymous visitors receive the IndieTerminal
// judging floor from loadWorkspaceSnapshot, so /webmcp is never an empty
// tool surface on the Vercel deploy.
export default async function WebMCPPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <WebMCPView initialSnapshot={snapshot} />;
}
