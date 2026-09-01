"use client";

import { useEffect } from "react";

/**
 * Boot registration in a separate chunk so a stall in tools.ts cannot freeze
 * the chrome. Never install a page shim here — ChatGPT Sol/Terra skip their
 * native bind if `document.modelContext` is already taken.
 */
export function WebMcpInstall() {
  useEffect(() => {
    void import("@/webmcp/provider").then((mod) => {
      mod.bootWebMCP();
    });
  }, []);
  return null;
}
