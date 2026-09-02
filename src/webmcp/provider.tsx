"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  inheritedRoomFingerprint,
  withInheritedDescriptions,
} from "@/lib/inherited-room";
import { useArena } from "@/lib/store";
import { adoptNativeIfPresent, forcePolyfill, browserContext } from "@/webmcp/polyfill";
import {
  registerArenaTools,
  type ArenaTool,
  type RegistrationOutcome,
} from "@/webmcp/registry";
import {
  type WebMCPSupport,
} from "@/webmcp/spec";

/**
 * Registers the Arena's tool surface for the lifetime of the tab.
 *
 * ChatGPT's desktop browser and Chrome look for document.modelContext as
 * soon as the page's JS runs. Aborting on React Strict Mode unmount was
 * unregistering every tool before a judge's agent could see them — so the
 * stable tools are started once per tab and never aborted from here.
 *
 * Nothing here writes to `document.modelContext`. When the browser implements
 * WebMCP the tools go onto the browser's context through registerTool; when it
 * does not they go onto the page's own object, which stays private to the page.
 * A browser context appearing at any later point takes over, and the tools are
 * re-registered onto it.
 *
 * WebMCP has no provideContext. The room the agent inherits lives in three
 * tool descriptions (`the_room`, plus a line on `stress_test_decision` and
 * `get_current_decision`). Those three are re-registered when the floor
 * changes; the other fourteen stay put.
 */

interface WebMCPSnapshot extends RegistrationOutcome {
  ready: boolean;
}

const idle: WebMCPSnapshot = {
  support: "unavailable" as WebMCPSupport,
  registered: [],
  ready: false,
};

const LIVE_TOOL_NAMES = new Set([
  "the_room",
  "stress_test_decision",
  "get_current_decision",
]);

let snapshot: WebMCPSnapshot = idle;
const listeners = new Set<() => void>();
let started = false;
let lifetime = new AbortController();
let liveCtl = new AbortController();
let lastFingerprint = "";
let timer: number | null = null;
let bootDone = false;
let nativeWatch: number | null = null;
let generation = 0;

function publish(next: WebMCPSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function tick() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function rotateSignals() {
  lifetime.abort();
  lifetime = new AbortController();
  liveCtl.abort();
  liveCtl = new AbortController();
}

async function loadGuestTools(): Promise<ArenaTool[]> {
  const { GUEST_TOOLS } = await import("@/webmcp/tools");
  try {
    if (!Array.isArray(GUEST_TOOLS) || GUEST_TOOLS.length === 0) {
      return [];
    }
    return withInheritedDescriptions(GUEST_TOOLS);
  } catch {
    return GUEST_TOOLS;
  }
}

function nativeWins(): boolean {
  return Boolean(browserContext());
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Sol/Terra and Chrome often bind `document.modelContext` after first paint.
 * Registering on the page object in that window makes the demo look like a
 * shim. Wait for the native object before falling back.
 */
async function waitForNative(): Promise<boolean> {
  if (browserContext()) return true;
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    await sleep(100);
    if (browserContext()) return true;
  }
  return Boolean(browserContext());
}

async function registerFull() {
  const gen = ++generation;
  try {
    await waitForNative();
    if (gen !== generation) return;
    const tools = await loadGuestTools();
    const stable = tools.filter((tool) => !LIVE_TOOL_NAMES.has(tool.name));
    const live = tools.filter((tool) => LIVE_TOOL_NAMES.has(tool.name));
    lastFingerprint = inheritedRoomFingerprint();
    let [stableResult, liveResult] = await Promise.all([
      registerArenaTools(stable, lifetime.signal),
      registerArenaTools(live, liveCtl.signal),
    ]);
    if (gen !== generation) return;
    if (
      stableResult.registered.length === 0 &&
      liveResult.registered.length === 0
    ) {
      if (nativeWins()) {
        await tick();
        if (gen !== generation) return;
      } else if (!browserContext()) {
        forcePolyfill();
      }
      [stableResult, liveResult] = await Promise.all([
        registerArenaTools(stable, lifetime.signal),
        registerArenaTools(live, liveCtl.signal),
      ]);
    }
    if (gen !== generation) return;
    bootDone = true;
    publish({
      support: stableResult.support,
      registered: [...stableResult.registered, ...liveResult.registered],
      error:
        [stableResult.error, liveResult.error].filter(Boolean).join("; ") ||
        undefined,
      ready: true,
    });
    if (inheritedRoomFingerprint() !== lastFingerprint) {
      void reregisterLive();
    }
  } catch (error) {
    if (gen !== generation) return;
    try {
      if (!browserContext()) forcePolyfill();
      const fallback = await registerArenaTools(
        await loadGuestTools(),
        lifetime.signal,
      );
      if (gen !== generation) return;
      bootDone = true;
      publish({
        ...fallback,
        error:
          error instanceof Error
            ? error.message
            : fallback.error ?? "WebMCP registration failed.",
        ready: true,
      });
    } catch (inner) {
      if (gen !== generation) return;
      bootDone = true;
      publish({
        support: "unavailable",
        registered: [],
        error:
          inner instanceof Error
            ? inner.message
            : "WebMCP registration failed.",
        ready: true,
      });
    }
  }
}

async function reregisterLive() {
  const fingerprint = inheritedRoomFingerprint();
  if (fingerprint === lastFingerprint) return;
  lastFingerprint = fingerprint;
  liveCtl.abort();
  liveCtl = new AbortController();
  const signal = liveCtl.signal;
  await tick();
  if (signal.aborted) return;
  const live = (await loadGuestTools()).filter((tool) =>
    LIVE_TOOL_NAMES.has(tool.name),
  );
  const result = await registerArenaTools(live, signal);
  if (signal.aborted) return;
  publish({
    support: snapshot.support,
    registered: [
      ...snapshot.registered.filter((name) => !LIVE_TOOL_NAMES.has(name)),
      ...result.registered,
    ],
    error: result.error,
    ready: true,
  });
}

/**
 * Trailing debounce, longest while a round is running.
 *
 * Every seat that writes an argument, risk, contradiction or evidence request
 * changes the inherited room, and re-registering on each one would rewrite the
 * tool set dozens of times during a single round — churn an agent reading the
 * list has to see through. Waiting for the floor to go quiet collapses a whole
 * round into one update.
 */
function scheduleReregister() {
  if (!bootDone) return;
  const opening = useArena.getState().arenaPhase === "opening";
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(
    () => {
      timer = null;
      void reregisterLive();
    },
    opening ? 1500 : 400,
  );
}

/**
 * A host can bind WebMCP well after first paint, so keep looking for the whole
 * session rather than for a few seconds after load.
 */
function watchNativeAdopt() {
  if (nativeWatch !== null) return;
  const check = () => {
    if (adoptNativeIfPresent()) {
      rotateSignals();
      void registerFull();
    }
  };
  nativeWatch = window.setInterval(check, 400);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
}

export function bootWebMCP() {
  if (started || typeof window === "undefined") return;
  started = true;
  watchNativeAdopt();
  void registerFull();
  useArena.subscribe(() => scheduleReregister());
}

if (typeof window !== "undefined") {
  window.setTimeout(() => bootWebMCP(), 0);
}

export function WebMCPBoot() {
  useEffect(() => {
    bootWebMCP();
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
