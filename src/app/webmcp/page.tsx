import type { Metadata } from "next";
import { WebMCPView } from "@/app/webmcp/webmcp-view";
import { loadWorkspaceSnapshot } from "@/server/workspace";

export const metadata: Metadata = {
  title: "WebMCP",
  description:
    "The tools ChatGPT can call on this page, in one line each, plus the prompt to run them on IndieTerminal.",
};

// Deliberately ungated. Anonymous visitors receive the IndieTerminal
// judging floor from loadWorkspaceSnapshot, so /webmcp is never an empty
// tool surface on the Vercel deploy.
export default async function WebMCPPage() {
  const snapshot = await loadWorkspaceSnapshot();
  return <WebMCPView initialSnapshot={snapshot} />;
}
