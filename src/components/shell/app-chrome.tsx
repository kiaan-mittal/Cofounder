"use client";

import type { ReactNode } from "react";

import { SiteHeader } from "@/components/shell/site-header";
import { Toaster } from "@/components/ui/sonner";
import { WebMCPBoot } from "@/webmcp/provider";

/**
 * Client chrome that sits *beside* the page slot, not around it.
 * Passing `{children}` through a client component from the root layout
 * is what Next 15.5 webpack reports as a missing clientReferenceManifest.
 */
export function AppChrome({ account }: { account: ReactNode }) {
  return (
    <>
      <WebMCPBoot />
      <SiteHeader account={account} />
      <Toaster position="bottom-right" />
    </>
  );
}
