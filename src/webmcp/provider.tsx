"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  registerArenaTools,
  type ArenaTool,
  type RegistrationOutcome,
} from "@/webmcp/registry";
import { ARENA_TOOLS } from "@/webmcp/tools";
import type { WebMCPSupport } from "@/webmcp/spec";

/**
 * Registers the Arena's tool surface for the lifetime of the tab.
 *
 * ChatGPT's desktop browser and Chrome look for document.modelContext as
 * soon as the page's JS runs. Aborting on React Strict Mode unmount was
 * unregistering every tool before a judge's agent could see them — so
 * registration is started once per tab and never aborted from here.
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
let started = false;

function publish(next: WebMCPSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function bootWebMCP() {
  if (started || typeof window === "undefined") return;
  started = true;
  void registerArenaTools(ARENA_TOOLS, new AbortController().signal).then(
    (result) => {
      publish({ ...result, ready: true });
    },
  );
}

if (typeof window !== "undefined") {
  bootWebMCP();
}

export function WebMCPBoot() {
  useEffect(() => {
    bootWebMCP();
  }, []);

  return null;
}

/**
 * Registers a contextual tool set for as long as the calling page is mounted,
 * and unregisters it on the way out. Unlike the always-on surface above, a
 * tool whose target disappears with the route has to leave with it.
 */
export function useScopedTools(tools: ArenaTool[]) {
  useEffect(() => {
    const controller = new AbortController();
    void registerArenaTools(tools, controller.signal);
    return () => controller.abort();
  }, [tools]);
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
