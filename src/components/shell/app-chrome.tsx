"use client";

import type { ReactNode } from "react";

import { SiteHeader } from "@/components/shell/site-header";
import { Toaster } from "@/components/ui/sonner";
import type { ProjectSummary } from "@/lib/projects";
import { WebMcpInstall } from "@/webmcp/install";

/**
 * Client chrome that sits *beside* the page slot, not around it.
 * Passing `{children}` through a client component from the root layout
 * is what Next 15.5 webpack reports as a missing clientReferenceManifest.
 */
export function AppChrome({
  account,
  signedIn,
  projects,
  activeProjectId,
}: {
  account: ReactNode;
  signedIn: boolean;
  projects: ProjectSummary[];
  activeProjectId: string | null;
}) {
  return (
    <>
      <WebMcpInstall />
      <SiteHeader
        account={account}
        signedIn={signedIn}
        projects={projects}
        activeProjectId={activeProjectId}
      />
      <Toaster position="bottom-right" />
    </>
  );
}
