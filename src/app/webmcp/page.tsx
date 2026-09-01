import type { Metadata } from "next";
import { WebMCPView } from "@/app/webmcp/webmcp-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "The guest protocol",
  description:
    "The rules an AI agent plays by inside Decision Arena: the tools it can call, the objects it writes on the shared table, and the one act it is never allowed to perform.",
};

// Deliberately ungated. The landing page sends people here to see the guest
// protocol, and this page seeds its own worked example client-side, so a
// first-time visitor or a reviewing agent can read the tool surface and run a
// real round without an account. loadWorkspaceSnapshot returns null when
// there is no session.
export default async function WebMCPPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <WebMCPView initialSnapshot={snapshot} />;
}
