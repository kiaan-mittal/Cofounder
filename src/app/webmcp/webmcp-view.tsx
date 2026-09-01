"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { InkRule } from "@/components/ink/marks";
import { HydrateWorkspace } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { SHOWCASE_COMPANY_ID } from "@/lib/guest-workspace";
import { showcaseSnapshot } from "@/lib/showcase-seed";
import { useArena } from "@/lib/store";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { readToolOutput } from "@/webmcp/compat";
import { getModelContext } from "@/webmcp/registry";
import { useWebMCP } from "@/webmcp/provider";
import { nativeModelContext, type RegisteredTool } from "@/webmcp/spec";
import { ARENA_TOOLS, TOOL_GROUPS } from "@/webmcp/tools";

export function WebMCPView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const { support, registered, ready, error } = useWebMCP();
  const toolCalls = useArena((state) => state.toolCalls);
  const storeCompany = useArena((state) => state.company);
  const importWorkspace = useArena((state) => state.importWorkspace);
  const snapshotCompany =
    initialSnapshot &&
    typeof initialSnapshot.company === "object" &&
    initialSnapshot.company
      ? (initialSnapshot.company as Company)
      : null;
  const company = storeCompany ?? snapshotCompany;
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
      <HydrateWorkspace initialSnapshot={initialSnapshot} />
      <header className="max-w-[62ch]">
        <p className="type-eyebrow">The guest protocol</p>
        <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.04]">
          ChatGPT can join this decision. It cannot own it.
        </h1>
        <p className="mt-7 text-[17px] leading-relaxed text-graphite">
          A chat is a room ChatGPT runs. This page is a room it visits. It
          reads the company and the scoreboard through tools, writes onto the
          same table the founder sees, and is refused if it tries to commit.
          {ARENA_TOOLS.length} primitives on{" "}
          <code className="type-figure text-[14px] text-ink">
            document.modelContext
          </code>
          . Founder clicks, seats, and a browser agent all call{" "}
          <code className="type-figure text-[14px] text-ink">executeTool</code>
          . None of them are wrappers around buttons.
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
        <Status
          label="Workspace"
          value={company ? company.name : "not loaded"}
          tone={company ? "moss" : "pencil"}
        />
      </div>

      <div className="mt-8 max-w-[70ch] border border-rule bg-leaf px-5 py-4">
        <p className="type-eyebrow">ChatGPT desktop</p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
          Open this HTTPS URL in ChatGPT desktop&rsquo;s in-app browser (Sol or
          Terra). Luna and most Enterprise builds do not expose{" "}
          <code className="type-figure text-[13px]">document.modelContext</code>
          . Wait until the page finishes loading — tools register once per tab
          and stay registered. Chrome 149+ with{" "}
          <code className="type-figure text-[13px]">
            chrome://flags/#enable-webmcp-testing
          </code>{" "}
          is the other supported path.
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-graphite">
          {company ? (
            <>
              The workspace is{" "}
              <span className="text-ink">{company.name}</span>
              {company.id === SHOWCASE_COMPANY_ID
                ? " — the public judging floor, already loaded. No account."
                : "."}{" "}
              Tools read this company. Do not sign in unless you want to replace
              it with your own repository.
            </>
          ) : (
            <>
              If the workspace is empty, tools will say there is no brain.{" "}
              <button
                type="button"
                onClick={() => importWorkspace(showcaseSnapshot())}
                className="underline underline-offset-4"
              >
                Load IndieTerminal
              </button>{" "}
              and the tools read a real company and a live decision.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {company ? (
            <Button asChild className="h-10 px-4">
              <Link href="/arena">Open Arena</Link>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => importWorkspace(showcaseSnapshot())}
                className="h-10 px-4"
              >
                Load IndieTerminal
              </Button>
              <Button asChild variant="outline" className="h-10 px-4">
                <Link href="/arena">Open Arena</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {!company || company.id === SHOWCASE_COMPANY_ID ? (
        <div className="mt-6 max-w-[62ch] border border-rule bg-paper px-5 py-4">
          <p className="type-eyebrow text-oxblood">Judge quickstart</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-graphite">
            Open{" "}
            <Link href="/arena" className="underline underline-offset-4">
              /arena
            </Link>
            . IndieTerminal is already loaded. In ChatGPT say: “Use Decision
            Arena to stress-test whether IndieTerminal should ship a public
            waitlist this week.” Do not click. Watch{" "}
            <code className="type-figure text-[13px] text-ink">
              stress_test_decision
            </code>{" "}
            fill the table. Then{" "}
            <code className="type-figure text-[13px] text-ink">
              confirm_commit
            </code>{" "}
            — refused. Then{" "}
            <code className="type-figure text-[13px] text-ink">
              share_decision
            </code>{" "}
            — the record leaves the chat. That is the product.
          </p>
        </div>
      ) : null}

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
            <code className="type-figure text-[13px]">toolchange</code> event.
          </p>
        </div>
      ) : null}

      <InkRule className="my-12" />

      {TOOL_GROUPS.map((group) => {
        const tools = ARENA_TOOLS.filter((tool) => tool.group === group.id);
        return (
          <section key={group.id} className="mb-14">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
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
                      <dl className="mt-4 space-y-2">
                        {Object.entries(properties).map(([key, schema]) => (
                          <div key={key} className="text-[12.5px]">
                            <dt className="type-figure text-ink">
                              {key}
                              {required.includes(key) ? (
                                <span className="text-oxblood">*</span>
                              ) : null}
                            </dt>
                            <dd className="mt-0.5 text-[13px] leading-relaxed text-graphite">
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

      <section className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <h2 className="type-display text-[28px] font-semibold">
            Try it yourself
          </h2>
          <ol className="mt-6 space-y-5">
            {[
              "Open /arena — no account. IndieTerminal and a live decision are already on the table. Do not type.",
              "In ChatGPT (or the in-page agent): “Use Decision Arena to stress-test whether IndieTerminal should ship a public waitlist this week.”",
              "Watch stress_test_decision fill the table — seats, contradictions, evidence — without a click.",
              "Ask it to confirm_commit. The page says no. Then you accept, hold, or reject.",
              "Then share_decision — destination slack sends it too. Open the public /share link. The record left the chat.",
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
                    className="type-figure text-[11.5px] leading-relaxed"
                  >
                    <span
                      className={cn(
                        "mr-2 inline-block size-1.5 rounded-full",
                        call.ok ? "bg-moss" : "bg-oxblood",
                      )}
                    />
                    <span className="text-ink">{call.tool}</span>
                    <span className="ml-2 text-graphite">{call.summary}</span>
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

function ReadOnlyRunner({ tool }: { tool: RegisteredTool | null }) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    const modelContext = getModelContext();
    if (!modelContext || !tool) return;

    setRunning(true);
    try {
      const result = await modelContext.executeTool(
        tool,
        nativeModelContext() ? "{}" : {},
      );
      setOutput(readToolOutput(result).text);
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
