"use client";

import type { AgentChannel } from "@/lib/types";
import { readToolOutput } from "@/webmcp/compat";
import {
  executeAndLog,
  getModelContext,
  withChannel,
} from "@/webmcp/registry";
import { nativeModelContext, type RegisteredTool } from "@/webmcp/spec";
import { ARENA_TOOLS } from "@/webmcp/tools";

/**
 * The only write path the app uses.
 *
 * Founder clicks, Arena seats, the in-page agent, and a ChatGPT tab all end
 * here. Prefer `document.modelContext.executeTool` so native WebMCP sees the
 * same traffic; fall back to the registered tool body only if discovery is
 * empty (the floor must not freeze because registration lagged).
 */

export type ToolRun = {
  ok: boolean;
  text: string;
  data: Record<string, unknown> | null;
};

let listed: RegisteredTool[] | null = null;
let listening = false;

function watchTools() {
  const modelContext = getModelContext();
  if (!modelContext || listening) return;
  listening = true;
  modelContext.addEventListener("toolchange", () => {
    listed = null;
  });
}

async function discover(): Promise<RegisteredTool[]> {
  const modelContext = getModelContext();
  if (!modelContext) return [];
  watchTools();
  if (listed?.length) return listed;
  const tools = await modelContext.getTools();
  if (tools.length) {
    listed = tools;
    return tools;
  }
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      modelContext.removeEventListener("toolchange", onChange);
      resolve([]);
    }, 4000);
    const onChange = () => {
      void modelContext.getTools().then((next) => {
        if (!next.length) return;
        window.clearTimeout(timeout);
        modelContext.removeEventListener("toolchange", onChange);
        listed = next;
        resolve(next);
      });
    };
    modelContext.addEventListener("toolchange", onChange);
  });
}

export function parseToolData(text: string): Record<string, unknown> | null {
  const marker = text.indexOf("\n\n{");
  if (marker < 0) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(marker + 2));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Direct body — used when a tool is already inside `executeTool` (ChatGPT
 * called `stress_test_decision`) and must not re-enter native executeTool.
 * Still logged and attributed. The table still moves.
 */
export async function runToolDirect(
  name: string,
  args: Record<string, unknown> = {},
  options?: { channel?: AgentChannel; signal?: AbortSignal },
): Promise<ToolRun> {
  const channel = options?.channel ?? "arena";
  return withChannel(channel, async () => {
    const tool = ARENA_TOOLS.find((entry) => entry.name === name);
    if (!tool) {
      return {
        ok: false,
        text: `No tool named "${name}" is registered on this page.`,
        data: null,
      };
    }
    const raw = await executeAndLog(tool, args, { signal: options?.signal });
    const { text, ok } = readToolOutput(raw);
    return { ok, text, data: parseToolData(text) };
  });
}

export async function runTool(
  name: string,
  args: Record<string, unknown> = {},
  options?: { channel?: AgentChannel; signal?: AbortSignal },
): Promise<ToolRun> {
  const channel = options?.channel ?? "founder";
  return withChannel(channel, async () => {
    const modelContext = getModelContext();
    const tools = await discover();
    const target = tools.find((tool) => tool.name === name);
    let raw: unknown;

    if (modelContext && target) {
      raw = await modelContext.executeTool(
        target,
        nativeModelContext() ? JSON.stringify(args) : args,
        { signal: options?.signal },
      );
    } else {
      const tool = ARENA_TOOLS.find((entry) => entry.name === name);
      if (!tool) {
        return {
          ok: false,
          text: `No tool named "${name}" is registered on this page.`,
          data: null,
        };
      }
      raw = await executeAndLog(tool, args, { signal: options?.signal });
    }

    const { text, ok } = readToolOutput(raw);
    return { ok, text, data: parseToolData(text) };
  });
}

/** Fire-and-forget founder click. Errors stay in the tool log. */
export function founderCall(name: string, args: Record<string, unknown> = {}) {
  void runTool(name, args, { channel: "founder" });
}
