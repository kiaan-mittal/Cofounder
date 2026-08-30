"use client";

import { useArena } from "@/lib/store";
import type { AgentChannel } from "@/lib/types";
import { coerceToolArgs, nativeToolText, toolAudience } from "@/webmcp/compat";
import { ensureModelContext, isPolyfilled } from "@/webmcp/polyfill";
import {
  nativeModelContext,
  toolError,
  type ModelContext,
  type ToolDefinition,
  type ToolExecuteOptions,
  type ToolResult,
  type WebMCPSupport,
} from "@/webmcp/spec";

/**
 * Registration, attribution and logging for Decision Arena's WebMCP tools.
 */

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

/**
 * Who is calling.
 *
 * The page's own sparring agent announces itself before invoking a tool. Any
 * call that arrives without that announcement came from outside the page —
 * a browser agent — and is labelled as such. The tool log shows this
 * distinction rather than claiming every call came from ChatGPT.
 */
let activeChannel: AgentChannel = "browser-agent";

export async function withChannel<T>(
  channel: AgentChannel,
  run: () => Promise<T>,
): Promise<T> {
  const previous = activeChannel;
  activeChannel = channel;
  try {
    return await run();
  } finally {
    activeChannel = previous;
  }
}

export function currentChannel(): AgentChannel {
  return activeChannel;
}

/* ------------------------------------------------------------------ */
/* Instrumentation                                                     */
/* ------------------------------------------------------------------ */

export interface ArenaTool extends Omit<ToolDefinition, "execute"> {
  /** Grouping used by the README and the tool-surface panel. */
  group: "context" | "debate" | "action" | "outcome";
  /** What the founder sees in the log when the tool runs. */
  humanLabel: string;
  execute: (
    args: Record<string, unknown>,
    options?: ToolExecuteOptions,
  ) => ToolResult | string | Promise<ToolResult | string>;
}

/**
 * Wraps a tool so every invocation is timed, recorded in the workspace log and
 * given a spotlight. The founder watching the screen should always be able to
 * see that something was changed by an agent, and which agent it was.
 */
function instrument(tool: ArenaTool): ToolDefinition {
  return {
    name: tool.name,
    title: tool.humanLabel,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    execute: async (rawArgs, options) => {
      const args = coerceToolArgs(rawArgs);
      const channel = currentChannel();
      const startedAt = performance.now();
      let result: ToolResult;
      let ok = true;

      try {
        const executed = await tool.execute(args, options);
        result =
          typeof executed === "string"
            ? { content: [{ type: "text", text: executed }] }
            : executed;
        ok = result.isError !== true;
      } catch (error) {
        ok = false;
        result = toolError(
          error instanceof Error
            ? error.message
            : "The tool failed for an unknown reason.",
        );
      }

      const summary = result.content[0]?.text.split("\n")[0] ?? tool.humanLabel;
      const store = useArena.getState();

      store.logToolCall({
        tool: tool.name,
        args,
        ok,
        summary: summary.slice(0, 200),
        channel,
        durationMs: Math.round(performance.now() - startedAt),
      });

      // Chrome / ChatGPT native WebMCP wants execute() to return a DOMString.
      const native = Boolean(nativeModelContext()) && !isPolyfilled();
      if (native) {
        return nativeToolText(result);
      }
      return result;
    },
  };
}


/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

export function getModelContext(): ModelContext | null {
  if (typeof document === "undefined") return null;
  return nativeModelContext() ?? document.modelContext ?? null;
}

export interface RegistrationOutcome {
  support: WebMCPSupport;
  registered: string[];
  error?: string;
}

/**
 * Registers the whole Arena tool surface. Lifetime is tied to `signal`,
 * because the spec has no unregisterTool().
 */
export async function registerArenaTools(
  tools: ArenaTool[],
  signal: AbortSignal,
): Promise<RegistrationOutcome> {
  const support = ensureModelContext();
  const modelContext = getModelContext();

  if (!modelContext) {
    return {
      support: "unavailable",
      registered: [],
      error:
        "This browser exposes no WebMCP entry point, so no tools were registered.",
    };
  }

  const registered: string[] = [];
  const errors: string[] = [];
  const audience = toolAudience();
  for (const tool of tools) {
    const definition = instrument(tool);
    try {
      await registerWithAudience(modelContext, definition, signal, audience);
      registered.push(tool.name);
    } catch (error) {
      errors.push(
        error instanceof Error ? `${tool.name}: ${error.message}` : tool.name,
      );
    }
  }
  return {
    support,
    registered,
    error: errors.length ? errors.join("; ") : undefined,
  };
}

async function registerWithAudience(
  modelContext: ModelContext,
  tool: ToolDefinition,
  signal: AbortSignal,
  audience: string[],
) {
  try {
    await modelContext.registerTool(tool, { signal, exposedTo: audience });
  } catch {
    await modelContext.registerTool(tool, { signal });
  }
}
