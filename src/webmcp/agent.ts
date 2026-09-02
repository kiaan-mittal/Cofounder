"use client";

import { readEventStream } from "@/lib/api";
import type { SparringPlan, SparringPlanEvent } from "@/lib/reading";
import { getModelContext } from "@/webmcp/registry";
import { runTool } from "@/webmcp/run";
import type { RegisteredTool } from "@/webmcp/spec";

/**
 * The in-page sparring agent.
 *
 * The WebMCP explainer calls this an "author-provided agent": an agent running
 * inside the page that discovers tools with `getTools()` and runs them with
 * `executeTool()`. It is given no privileged access to the store — it sees
 * exactly what a browser agent sees, through exactly the same two calls.
 *
 * That constraint is deliberate. It means the WebMCP surface is exercised for
 * real on every run, and a judge on a browser without native WebMCP still
 * watches genuine tool traffic rather than a scripted animation.
 *
 * The model itself runs server-side, because API keys never belong in a page.
 * The server only ever chooses *which* tool to call; the call happens here.
 */

export interface AgentStep {
  kind: "thought" | "tool" | "message" | "error";
  text: string;
  pending?: boolean;
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
  ok?: boolean;
}

export interface SparringRunOptions {
  goal: string;
  onStep: (step: AgentStep) => void;
  signal?: AbortSignal;
  maxSteps?: number;
}

interface TranscriptEntry {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

export class WebMCPUnavailableError extends Error {}

async function waitForTools(signal?: AbortSignal): Promise<RegisteredTool[]> {
  const deadline = Date.now() + 1500;
  while (!signal?.aborted) {
    const modelContext = getModelContext();
    if (modelContext) {
      const tools = await modelContext.getTools();
      if (tools.length > 0) return tools;
    }
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  const modelContext = getModelContext();
  if (!modelContext) {
    throw new WebMCPUnavailableError(
      "No WebMCP entry point is available in this browser, so the agent has nothing to connect to.",
    );
  }
  return modelContext.getTools();
}

export async function runSparringAgent({
  goal,
  onStep,
  signal,
  maxSteps = 6,
}: SparringRunOptions): Promise<void> {
  const tools = await waitForTools(signal);
  if (tools.length === 0) {
    throw new WebMCPUnavailableError(
      "No tools are registered on this page yet. Try again in a moment.",
    );
  }

  const transcript: TranscriptEntry[] = [];
  const catalog = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
  }));

  for (let step = 0; step < maxSteps; step += 1) {
    if (signal?.aborted) return;

    const plan = await planSparringStep({
      goal,
      tools: catalog,
      transcript,
      stepsRemaining: maxSteps - step,
      signal,
      onPartial: (partial) => {
        if (partial.reasoning) {
          onStep({ kind: "thought", text: partial.reasoning });
        }
        if (partial.message) {
          onStep({ kind: "message", text: partial.message, pending: true });
        }
      },
    });

    if (plan.reasoning) {
      onStep({ kind: "thought", text: plan.reasoning });
    }

    if (plan.action === "respond" || !plan.tool) {
      onStep({
        kind: "message",
        text: plan.message ?? "The agent finished without a closing remark.",
      });
      return;
    }

    const target = tools.find((tool) => tool.name === plan.tool);
    if (!target) {
      transcript.push({
        tool: plan.tool,
        args: {},
        result: `No tool named "${plan.tool}" is registered on this page.`,
      });
      onStep({
        kind: "error",
        text: `The agent asked for a tool this page does not expose: ${plan.tool}`,
      });
      continue;
    }

    let args: Record<string, unknown> = {};
    if (plan.argsJson) {
      try {
        const parsed = JSON.parse(plan.argsJson);
        if (parsed && typeof parsed === "object") {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // A malformed argument object is the model's problem to fix on the
        // next turn, not a reason to abandon the run.
        transcript.push({
          tool: plan.tool,
          args: {},
          result: "Arguments were not valid JSON. Send a JSON object.",
        });
        onStep({
          kind: "error",
          text: `Arguments for ${plan.tool} were not valid JSON.`,
        });
        continue;
      }
    }

    onStep({
      kind: "thought",
      text: plan.reasoning || `Calling ${target.name}…`,
    });
    onStep({
      kind: "tool",
      text: plan.reasoning,
      tool: target.name,
      args,
    });

    try {
      const { text, ok } = await runTool(plan.tool, args, {
        channel: "in-page-agent",
        signal,
      });

      transcript.push({ tool: target.name, args, result: text.slice(0, 4000) });
      onStep({
        kind: "tool",
        text: plan.reasoning,
        tool: target.name,
        args,
        result: text,
        ok,
      });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "The tool call failed.";
      transcript.push({ tool: target.name, args, result: `Error: ${text}` });
      onStep({ kind: "error", text: `${target.name} failed: ${text}` });
    }
  }

  if (signal?.aborted) return;

  const close = await planSparringStep({
    goal,
    tools: catalog,
    transcript,
    stepsRemaining: 0,
    closeOut: true,
    signal,
    onPartial: (partial) => {
      if (partial.reasoning) {
        onStep({ kind: "thought", text: partial.reasoning });
      }
      if (partial.message) {
        onStep({ kind: "message", text: partial.message, pending: true });
      }
    },
  });
  onStep({
    kind: "message",
    text:
      close.message?.trim() ||
      close.reasoning?.trim() ||
      "I wrote what I could onto the board from this pass.",
  });
}

async function planSparringStep({
  goal,
  tools,
  transcript,
  stepsRemaining,
  closeOut = false,
  signal,
  onPartial,
}: {
  goal: string;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  transcript: TranscriptEntry[];
  stepsRemaining: number;
  closeOut?: boolean;
  signal?: AbortSignal;
  onPartial?: (partial: { reasoning?: string; message?: string }) => void;
}): Promise<SparringPlan> {
  let step: SparringPlan | null = null;

  await readEventStream<SparringPlanEvent>(
    "/api/sparring",
    {
      goal,
      tools,
      transcript,
      stepsRemaining,
      closeOut,
    },
    (event) => {
      if (event.type === "error") {
        throw new Error(event.message);
      }
      if (event.type === "started") {
        onPartial?.({ reasoning: "Working…" });
      }
      if (event.type === "partial") {
        onPartial?.({
          reasoning: event.reasoning,
          message: event.message,
        });
      }
      if (event.type === "done") {
        step = event.step;
      }
    },
    signal,
  );

  if (!step) {
    throw new Error("The sparring agent could not reach its model.");
  }

  return step;
}

