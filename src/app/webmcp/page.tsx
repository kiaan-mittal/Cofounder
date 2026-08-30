"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { InkRule } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getModelContext } from "@/webmcp/registry";
import { useWebMCP } from "@/webmcp/provider";
import type { RegisteredTool } from "@/webmcp/spec";
import { ARENA_TOOLS, TOOL_GROUPS } from "@/webmcp/tools";

/**
 * The tool surface, written for someone evaluating the WebMCP integration.
 *
 * It reads the live registration through `getTools()` rather than listing the
 * source definitions, so what is shown is what an agent would actually find.
 */
export default function WebMCPPage() {
  const { support, registered, ready, error } = useWebMCP();
  const toolCalls = useArena((state) => state.toolCalls);
  const [discovered, setDiscovered] = useState<RegisteredTool[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    const modelContext = getModelContext();
    if (!modelContext) return;

    let cancelled = false;
    const refresh = () => {
      modelContext
        .getTools()
        .then((tools) => {
          if (!cancelled) setDiscovered(tools);
        })
        .catch(() => undefined);
    };

    refresh();
    modelContext.addEventListener("toolchange", refresh);
    return () => {
      cancelled = true;
      modelContext.removeEventListener("toolchange", refresh);
    };
  }, [ready]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <header className="max-w-[62ch]">
        <p className="type-eyebrow">WebMCP</p>
        <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.04]">
          What an agent can do inside this page.
        </h1>
        <p className="mt-7 text-[17px] leading-relaxed text-graphite">
          Decision Arena registers {ARENA_TOOLS.length} tools on{" "}
          <code className="type-figure text-[14px] text-ink">
            document.modelContext
          </code>
          . Each one is a decision primitive — read the Company Brain, write or
          draw on the shared table, challenge an argument, record what reality
          did. None of them are wrappers around buttons.
        </p>
      </header>

      <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
        <Status
          label="Implementation"
          value={
            !ready
              ? "checking…"
              : support === "native"
                ? "native document.modelContext"
                : support === "polyfill"
                  ? "spec-shaped shim"
                  : "unavailable"
          }
          tone={
            support === "native"
              ? "moss"
              : support === "polyfill"
                ? "ochre"
                : "pencil"
          }
        />
        <Status
          label="Registered"
          value={`${registered.length} tools`}
          tone="ink"
        />
        <Status
          label="Discovered via getTools()"
          value={discovered === null ? "…" : `${discovered.length} tools`}
          tone="ink"
        />
      </div>

      {error ? (
        <p className="mt-4 text-[14px] text-oxblood">{error}</p>
      ) : null}

      {support === "polyfill" ? (
        <div className="mt-8 max-w-[70ch] border border-rule bg-ochre-wash px-5 py-4">
          <p className="type-eyebrow text-ochre">About the shim</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
            This browser does not implement WebMCP, so the Arena installed a
            local implementation of the same interface —{" "}
            <code className="type-figure text-[13px]">registerTool</code>,{" "}
            <code className="type-figure text-[13px]">getTools</code>,{" "}
            <code className="type-figure text-[13px]">executeTool</code> and the{" "}
            <code className="type-figure text-[13px]">toolchange</code> event. It
            is only installed when the platform provides nothing; in Chrome with{" "}
            <code className="type-figure text-[13px]">
              chrome://flags/#enable-webmcp-testing
            </code>{" "}
            enabled, or in ChatGPT&rsquo;s browser, the native implementation is
            used untouched and this notice disappears.
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink">
            The tool definitions, schemas and execution path are identical either
            way. The page&rsquo;s own sparring agent is an author-provided agent
            in the spec&rsquo;s sense: it has no privileged access and reaches
            the workspace only through discovery and execution.
          </p>
        </div>
      ) : null}

      <InkRule className="my-12" />

      {/* Tool groups */}
      {TOOL_GROUPS.map((group) => {
        const tools = ARENA_TOOLS.filter((tool) => tool.group === group.id);
        return (
          <section key={group.id} className="mb-14">
            <div className="flex items-baseline gap-4">
              <h2 className="type-display text-[28px] font-semibold">
                {group.title}
              </h2>
              <p className="text-[15px] text-graphite">{group.blurb}</p>
            </div>

            <ul className="mt-7 grid gap-px bg-rule md:grid-cols-2">
              {tools.map((tool) => {
                const liveTool = discovered?.find((t) => t.name === tool.name);
                const live = Boolean(liveTool);
                const properties =
                  (tool.inputSchema?.properties as
                    | Record<string, { description?: string }>
                    | undefined) ?? {};
                const required = tool.inputSchema?.required ?? [];

                return (
                  <li key={tool.name} className="bg-paper p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <code className="type-figure text-[14px] font-medium text-ink">
                        {tool.name}
                      </code>
                      <span
                        className={cn(
                          "type-eyebrow shrink-0",
                          live ? "text-moss" : "text-pencil",
                        )}
                      >
                        {live ? "registered" : "—"}
                      </span>
                    </div>

                    <p className="mt-3 text-[14px] leading-relaxed text-graphite">
                      {tool.description}
                    </p>

                    {Object.keys(properties).length ? (
                      <dl className="mt-4 space-y-1.5">
                        {Object.entries(properties).map(([key, schema]) => (
                          <div key={key} className="flex gap-2 text-[12.5px]">
                            <dt className="type-figure shrink-0 text-ink">
                              {key}
                              {required.includes(key) ? (
                                <span className="text-oxblood">*</span>
                              ) : null}
                            </dt>
                            <dd className="truncate text-pencil">
                              {schema?.description ?? ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="type-eyebrow mt-4">no arguments</p>
                    )}

                    {tool.annotations?.readOnlyHint ? (
                      <ReadOnlyRunner tool={liveTool ?? null} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <InkRule className="my-12" />

      {/* How to try it */}
      <section className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <h2 className="type-display text-[28px] font-semibold">
            Try it yourself
          </h2>
          <ol className="mt-6 space-y-5">
            {[
              "Open the worked example, or build a Brain from your own site and repository.",
              "Open a decision in the Arena so there is something to argue about.",
              "In a WebMCP-enabled browser, ask your agent to read the current decision and challenge it. Or use the agent console in the Arena, which goes through the same getTools() and executeTool() calls.",
              "Watch the workspace change: an argument gets a red ring, a contradiction appears in the margin, a risk lands. Then answer it.",
            ].map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="type-figure w-6 shrink-0 text-[12px] text-pencil">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] leading-relaxed text-ink">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-8 h-10 px-5">
            <Link href="/arena">Open the Arena</Link>
          </Button>
        </div>

        <div>
          <h2 className="type-eyebrow">Registration, verbatim</h2>
          <pre className="mt-4 overflow-x-auto border border-rule bg-leaf p-5 text-[12px] leading-relaxed">
            <code className="font-mono text-ink">{`// src/webmcp/registry.ts
const modelContext =
  document.modelContext ?? navigator.modelContext;

for (const tool of ARENA_TOOLS) {
  await modelContext.registerTool(instrument(tool), {
    signal, // the spec has no unregisterTool()
  });
}

// src/webmcp/agent.ts — the in-page agent
const tools  = await modelContext.getTools();
const target = tools.find(t => t.name === plan.tool);
const result = await modelContext.executeTool(target, args);`}</code>
          </pre>

          {toolCalls.length ? (
            <>
              <h2 className="type-eyebrow mt-10">Recent tool traffic</h2>
              <ul className="mt-4 space-y-2">
                {toolCalls.slice(0, 12).map((call) => (
                  <li
                    key={call.id}
                    className="type-figure flex items-baseline gap-2 text-[11.5px]"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        call.ok ? "bg-moss" : "bg-oxblood",
                      )}
                    />
                    <span className="shrink-0 text-ink">{call.tool}</span>
                    <span className="truncate text-pencil">{call.summary}</span>
                    <span className="ml-auto shrink-0 text-pencil">
                      {call.channel === "in-page-agent"
                        ? "in-page agent"
                        : "browser agent"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * Runs a read-only tool through the real `executeTool()` path.
 *
 * This exists so the tool surface can be checked without model credentials or
 * a WebMCP-enabled browser: the output below is exactly the payload an agent
 * would receive, produced by the same call it would make.
 */
function ReadOnlyRunner({ tool }: { tool: RegisteredTool | null }) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    const modelContext = getModelContext();
    if (!modelContext || !tool) return;

    setRunning(true);
    try {
      const result = await modelContext.executeTool(tool, {});
      setOutput(result.content.map((part) => part.text).join("\n"));
    } catch (error) {
      setOutput(
        error instanceof Error ? error.message : "The tool call failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <span className="type-eyebrow text-moss">read only</span>
        <button
          type="button"
          onClick={run}
          disabled={!tool || running}
          className="type-eyebrow underline underline-offset-4 transition-colors hover:text-ink disabled:no-underline disabled:opacity-40"
        >
          {running ? "running…" : output ? "run again" : "run it"}
        </button>
        {output ? (
          <button
            type="button"
            onClick={() => setOutput(null)}
            className="type-eyebrow ml-auto text-pencil hover:text-ink"
          >
            hide
          </button>
        ) : null}
      </div>

      {output ? (
        <pre className="mt-3 max-h-56 overflow-auto border border-rule bg-leaf p-3 text-[11.5px] leading-relaxed">
          <code className="whitespace-pre-wrap font-mono text-ink">
            {output}
          </code>
        </pre>
      ) : null}
    </div>
  );
}

function Status({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "moss" | "ochre" | "pencil" | "ink";
}) {
  return (
    <div>
      <p className="type-eyebrow">{label}</p>
      <p
        className={cn(
          "type-figure mt-1 text-[14px]",
          tone === "moss" && "text-moss",
          tone === "ochre" && "text-ochre",
          tone === "pencil" && "text-pencil",
          tone === "ink" && "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
