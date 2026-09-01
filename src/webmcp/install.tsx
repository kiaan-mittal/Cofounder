"use client";

import { useEffect } from "react";

/**
 * Boot registration in a separate chunk so a stall in tools.ts cannot freeze
 * the chrome. Do not install the page shim here — ChatGPT Sol binds native
 * `document.modelContext` as a getter, and an eager own-property polyfill
 * would hide it.
 */
export function WebMcpInstall() {
  useEffect(() => {
    void import("@/webmcp/provider").then((mod) => {
      mod.bootWebMCP();
    });
  }, []);
  return null;
}
