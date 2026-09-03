"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

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
  const router = useRouter();

  useEffect(() => {
    function onNavigate(event: Event) {
      const path = (event as CustomEvent<string>).detail;
      if (path === "/history" || path === "/calibration") {
        router.push(path);
      }
    }
    window.addEventListener("arena:navigate", onNavigate);
    return () => window.removeEventListener("arena:navigate", onNavigate);
  }, [router]);

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
