"use client";

import { getModelContext, withChannel } from "@/webmcp/registry";
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

export async function runSparringAgent({
  goal,
  onStep,
  signal,
  maxSteps = 8,
}: SparringRunOptions): Promise<void> {
  const modelContext = getModelContext();
  if (!modelContext) {
    throw new WebMCPUnavailableError(
      "No WebMCP entry point is available in this browser, so the agent has nothing to connect to.",
    );
  }

  // Discovery — the same call a browser agent makes.
  const tools: RegisteredTool[] = await modelContext.getTools();
  if (tools.length === 0) {
    throw new WebMCPUnavailableError(
      "No tools are registered on this page yet. Try again in a moment.",
    );
  }

  const transcript: TranscriptEntry[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    if (signal?.aborted) return;

    const response = await fetch("/api/sparring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        goal,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
        })),
        transcript,
        stepsRemaining: maxSteps - step,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body.error ?? "The sparring agent could not reach its model.",
      );
    }

    const plan = (await response.json()) as {
      reasoning: string;
      action: "call_tool" | "respond";
      tool: string | null;
      argsJson: string | null;
      message: string | null;
    };

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

    try {
      // Execution — through WebMCP, attributed honestly in the tool log.
      const result = await withChannel("in-page-agent", () =>
        modelContext.executeTool(target, args, { signal }),
      );
      const text = result.content.map((part) => part.text).join("\n");

      transcript.push({ tool: target.name, args, result: text.slice(0, 4000) });
      onStep({
        kind: "tool",
        text: plan.reasoning,
        tool: target.name,
        args,
        result: text,
        ok: result.isError !== true,
      });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "The tool call failed.";
      transcript.push({ tool: target.name, args, result: `Error: ${text}` });
      onStep({ kind: "error", text: `${target.name} failed: ${text}` });
    }
  }

  onStep({
    kind: "message",
    text: "The agent reached its step limit. Run it again to continue.",
  });
}
