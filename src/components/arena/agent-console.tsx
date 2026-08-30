"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useArena } from "@/lib/store";
import { runSparringAgent, WebMCPUnavailableError, type AgentStep } from "@/webmcp/agent";
import { useWebMCP } from "@/webmcp/provider";
import { cn } from "@/lib/utils";

/**
 * Let an agent onto the same table.
 *
 * It does not chat beside the board. It discovers WebMCP tools and writes
 * arguments, risks and evidence onto the same objects the founder is using.
 */

const PROMPTS = [
  {
    label: "Find my blind spot",
    goal: "Read the Company Brain, the current decision and my measured calibration patterns. Find the single most important thing I am missing and put it into the workspace where I have to answer it.",
  },
  {
    label: "Check this against my history",
    goal: "Read my decision history and calibration patterns, then check whether I am repeating a decision or a rationale that has already failed. If I am, flag it as a contradiction with both sides quoted.",
  },
  {
    label: "Attack my weakest assumption",
    goal: "Find the assumption in the Company Brain that this decision most depends on and that is least supported, then argue against it from the perspective best placed to do so, and request the specific evidence that would settle it.",
  },
];

export function AgentConsole() {
  const { support, registered, ready } = useWebMCP();
  const toolCalls = useArena((state) => state.toolCalls);

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (goal: string) => {
    setError(null);
    setSteps([]);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await runSparringAgent({
        goal,
        signal: controller.signal,
        onStep: (step) => setSteps((previous) => [...previous, step]),
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("Stopped.");
      } else if (caught instanceof WebMCPUnavailableError) {
        setError(caught.message);
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "The agent could not complete its turn.",
        );
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, []);

  const unavailable = ready && support === "unavailable";

  return (
    <section className="border border-rule bg-leaf">
      <header className="border-b border-rule px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="type-display text-[19px] font-semibold">
            Let an agent onto the table
          </h2>
          <span className="type-eyebrow shrink-0">
            {registered.length} tools
          </span>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-graphite">
          It discovers this page&rsquo;s tools with{" "}
          <code className="type-figure text-[12px] text-ink">getTools()</code>{" "}
          and runs them with{" "}
          <code className="type-figure text-[12px] text-ink">executeTool()</code>
          . Whatever it changes lands on the same cards you are writing on.
        </p>
      </header>

      {unavailable ? (
        <div className="px-5 py-5">
          <p className="text-[14px] leading-relaxed text-ink">
            This browser exposes no WebMCP entry point, so the agent has nothing
            to connect to. Every other part of the Arena still works.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {PROMPTS.map((prompt) => (
              <Button
                key={prompt.label}
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => run(prompt.goal)}
                className="type-eyebrow bg-paper"
              >
                {prompt.label}
              </Button>
            ))}
            {running ? (
              <Button
                variant="ghost"
                size="sm"
                className="type-eyebrow text-oxblood"
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </Button>
            ) : null}
          </div>

          {error ? (
            <p className="border-t border-rule px-5 py-3 text-[13.5px] text-oxblood">
              {error}
            </p>
          ) : null}

          {steps.length ? (
            <ol className="space-y-4 border-t border-rule px-5 py-5">
              {steps.map((step, index) => (
                <li key={index} className="rise-in">
                  {step.kind === "tool" ? (
                    <div>
                      <p className="text-[14px] leading-relaxed text-ink">
                        {step.text}
                      </p>
                      <div className="mt-2 border border-rule bg-leaf px-3 py-2">
                        <p className="type-figure text-[12px] text-ink">
                          {step.tool}(
                          <span className="text-graphite">
                            {compactArgs(step.args)}
                          </span>
                          )
                        </p>
                        <p
                          className={cn(
                            "type-figure mt-1 line-clamp-3 text-[11.5px] leading-relaxed",
                            step.ok ? "text-graphite" : "text-oxblood",
                          )}
                        >
                          {step.result?.split("\n")[0]}
                        </p>
                      </div>
                    </div>
                  ) : step.kind === "message" ? (
                    <p className="text-[15px] leading-relaxed text-ink">
                      {step.text}
                    </p>
                  ) : step.kind === "error" ? (
                    <p className="text-[13.5px] text-oxblood">{step.text}</p>
                  ) : (
                    <p className="text-[14px] leading-relaxed text-graphite">
                      {step.text}
                    </p>
                  )}
                </li>
              ))}
              {running ? (
                <li className="type-eyebrow animate-pulse">working…</li>
              ) : null}
            </ol>
          ) : null}
        </>
      )}

      {toolCalls.length ? (
        <div className="border-t border-rule px-5 py-4">
          <p className="type-eyebrow">Tool traffic</p>
          <ul className="mt-3 space-y-1.5">
            {toolCalls.slice(0, 8).map((call) => (
              <li
                key={call.id}
                className="type-figure flex items-baseline gap-2 text-[11.5px]"
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 translate-y-[-1px] rounded-full",
                    call.ok ? "bg-moss" : "bg-oxblood",
                  )}
                />
                <span className="shrink-0 text-ink">{call.tool}</span>
                <span className="truncate text-pencil">{call.summary}</span>
                <span className="ml-auto shrink-0 text-pencil">
                  {call.channel === "in-page-agent" ? "in-page" : "browser"} ·{" "}
                  {call.durationMs}ms
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function compactArgs(args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return "";
  return Object.entries(args)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${key}: ${text.length > 34 ? `${text.slice(0, 34)}…` : text}`;
    })
    .join(", ");
}
