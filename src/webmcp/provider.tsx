"use client";

import { useEffect, useSyncExternalStore } from "react";

import { registerArenaTools, type RegistrationOutcome } from "@/webmcp/registry";
import { ARENA_TOOLS } from "@/webmcp/tools";
import type { WebMCPSupport } from "@/webmcp/spec";

/**
 * Registers the Arena's tool surface for the lifetime of the tab.
 *
 * This is a boot component plus a module store — not a React tree wrapper —
 * so the root layout can keep `{children}` as a server slot. Wrapping the
 * page slot in a client provider is what trips Next 15.5's webpack
 * `clientReferenceManifest` invariant.
 *
 * Registration is scoped to an AbortController because the WebMCP spec has no
 * unregisterTool() — aborting the signal is the documented way to take tools
 * off the table.
 */

interface WebMCPSnapshot extends RegistrationOutcome {
  ready: boolean;
}

const idle: WebMCPSnapshot = {
  support: "unavailable" as WebMCPSupport,
  registered: [],
  ready: false,
};

let snapshot: WebMCPSnapshot = idle;
const listeners = new Set<() => void>();

function publish(next: WebMCPSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function WebMCPBoot() {
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    registerArenaTools(ARENA_TOOLS, controller.signal).then((result) => {
      if (!cancelled) publish({ ...result, ready: true });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return null;
}

export function useWebMCP(): WebMCPSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => snapshot,
    () => idle,
  );
}
