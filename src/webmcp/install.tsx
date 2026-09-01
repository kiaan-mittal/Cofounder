"use client";

import { useEffect } from "react";

import { ensureModelContext } from "@/webmcp/polyfill";

/**
 * Install document.modelContext before the tool graph loads, then boot
 * registration in a separate chunk so a stall in tools.ts cannot freeze
 * the chrome.
 */
ensureModelContext();

export function WebMcpInstall() {
  useEffect(() => {
    void import("@/webmcp/provider").then((mod) => {
      mod.bootWebMCP();
    });
  }, []);
  return null;
}
