"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyLine } from "@/components/ink/copy-line";
import { HydrateWorkspace } from "@/components/shell/require-company";
import {
  JUDGE_CALLS,
  JUDGE_COMPANY,
  JUDGE_PROMPT,
  JUDGE_STEPS,
} from "@/lib/judge-path";
import { useArena } from "@/lib/store";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { readToolOutput } from "@/webmcp/compat";
import { getModelContext } from "@/webmcp/registry";
import { useWebMCP } from "@/webmcp/provider";
import {
  nativeModelContext,
  webmcpDiagnostics,
  type RegisteredTool,
  type WebMCPDiagnostics,
} from "@/webmcp/spec";
import { GUEST_TOOLS, TOOL_GROUPS, toolSummary } from "@/webmcp/tools";

export function WebMCPView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const { support, registered, ready, error } = useWebMCP();
  const toolCalls = useArena((state) => state.toolCalls);
  const storeCompany = useArena((state) => state.company);
  const snapshotCompany =
    initialSnapshot &&
    typeof initialSnapshot.company === "object" &&
    initialSnapshot.company
      ? (initialSnapshot.company as Company)
      : null;
  const company = storeCompany ?? snapshotCompany;
  const [discovered, setDiscovered] = useState<RegisteredTool[] | null>(null);
  const [probe, setProbe] = useState<WebMCPDiagnostics | null>(null);

  useEffect(() => {
    const read = () => setProbe(webmcpDiagnostics());
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
  }, [ready, support, registered.length]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 lg:py-16">
      <HydrateWorkspace initialSnapshot={initialSnapshot} />

      <header className="max-w-[40ch]">
        <p className="type-eyebrow">WebMCP</p>
        <h1 className="type-display mt-4 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.04]">
          {GUEST_TOOLS.length} tools. One they cannot press.
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-graphite">
          ChatGPT reads {company?.name ?? JUDGE_COMPANY}, writes on the same
          table you see, and is refused if it tries to commit.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
        <Status
          label="This browser"
          value={
            !ready
              ? "checking…"
              : support === "native"
                ? "native"
                : support === "page"
                  ? "in-page"
                  : "unavailable"
          }
          tone={
            support === "native"
              ? "moss"
              : support === "page"
                ? "ochre"
                : "pencil"
          }
        />
        <Status
          label="Registered"
          value={`${registered.length}`}
          tone="ink"
        />
        <Status
          label="getTools()"
          value={discovered === null ? "…" : `${discovered.length}`}
          tone="ink"
        />
        <Status
          label="Workspace"
          value={company ? company.name : "not loaded"}
          tone={company ? "moss" : "pencil"}
        />
      </div>

      {error ? (
        <p className="mt-4 text-[15px] text-oxblood">{error}</p>
      ) : null}

      <section className="mt-12 border border-rule bg-leaf px-6 py-6">
        <p className="type-eyebrow">Run it</p>
        <ol className="mt-5 space-y-5">
          {JUDGE_STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="type-figure w-8 shrink-0 pt-0.5 text-[13px] text-pencil">
                {step.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="type-display text-[22px] font-semibold">
                  {step.title}
                </p>
                {step.n === "02" ? (
                  <CopyLine text={JUDGE_PROMPT} className="mt-3" />
                ) : (
                  <p className="mt-1.5 text-[16px] leading-relaxed text-graphite">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <Link
            href="/arena"
            className="inline-flex h-11 items-center bg-ink px-5 text-[15px] font-medium text-paper"
          >
            Open the Arena
          </Link>
          <p className="text-[14px] text-graphite">
            ChatGPT desktop: Sol or Terra, site tools on. Or Chrome 149+ with
            the WebMCP flag.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <p className="type-eyebrow">Example calls</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {JUDGE_CALLS.map((item) => (
            <li key={item.tool} className="border border-rule bg-paper p-5">
              <code className="type-figure text-[15px] text-ink">
                {item.tool}
              </code>
              <p className="mt-3 text-[16px] leading-relaxed text-graphite">
                {item.happens}
              </p>
              <CopyLine text={item.say} className="mt-4 px-3 py-2">
                <span className="text-[13px] leading-snug">{item.say}</span>
              </CopyLine>
            </li>
          ))}
        </ul>
      </section>

      {toolCalls.length ? (
        <section className="mt-12">
          <p className="type-eyebrow">Calls this session</p>
          <ul className="mt-4 space-y-2">
            {toolCalls.slice(0, 12).map((call) => (
              <li
                key={call.id}
                className="flex items-baseline gap-3 text-[15px] leading-relaxed"
              >
                <span
                  className={cn(
                    "mt-[7px] inline-block size-1.5 shrink-0 rounded-full",
                    call.ok ? "bg-moss" : "bg-oxblood",
                  )}
                />
                <code className="type-figure text-[14px] text-ink">
                  {call.tool}
                </code>
                <span className="text-graphite">{call.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16">
        {TOOL_GROUPS.map((group) => {
          const tools = GUEST_TOOLS.filter((tool) => tool.group === group.id);
          return (
            <div key={group.id} className="mb-12">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="type-display text-[28px] font-semibold">
                  {group.title}
                </h2>
                <p className="text-[16px] text-graphite">{group.blurb}</p>
              </div>
              <ul className="mt-5 divide-y divide-rule border-y border-rule">
                {tools.map((tool) => {
                  const liveTool = discovered?.find(
                    (item) => item.name === tool.name,
                  );
                  const live = Boolean(liveTool);
                  const properties =
                    (tool.inputSchema?.properties as
                      | Record<string, { description?: string }>
                      | undefined) ?? {};
                  const required = tool.inputSchema?.required ?? [];
                  const keys = Object.keys(properties);

                  return (
                    <li key={tool.name} className="py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <code className="type-figure text-[16px] font-medium text-ink">
                          {tool.name}
                        </code>
                        <span
                          className={cn(
                            "type-eyebrow",
                            live ? "text-moss" : "text-pencil",
                          )}
                        >
                          {live ? "registered" : "—"}
                        </span>
                      </div>
                      <p className="mt-2 max-w-[52ch] text-[17px] leading-relaxed text-ink">
                        {toolSummary(tool)}
                      </p>
                      {keys.length ? (
                        <details className="mt-3">
                          <summary className="type-eyebrow cursor-pointer text-graphite hover:text-ink">
                            {keys.length}{" "}
                            {keys.length === 1 ? "argument" : "arguments"}
                          </summary>
                          <dl className="mt-3 space-y-2">
                            {Object.entries(properties).map(([key, schema]) => (
                              <div key={key}>
                                <dt className="type-figure text-[13px] text-ink">
                                  {key}
                                  {required.includes(key) ? (
                                    <span className="text-oxblood">*</span>
                                  ) : null}
                                </dt>
                                <dd className="mt-0.5 text-[14px] leading-relaxed text-graphite">
                                  {schema?.description ?? ""}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : (
                        <p className="type-eyebrow mt-3">no arguments</p>
                      )}
                      {tool.annotations?.readOnlyHint ? (
                        <ReadOnlyRunner tool={liveTool ?? null} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <details className="mt-4 border-t border-rule pt-8">
        <summary className="type-eyebrow cursor-pointer hover:text-ink">
          Browser notes
        </summary>
        <div className="mt-5 max-w-[62ch] space-y-4 text-[15px] leading-relaxed text-graphite">
          <p>
            ChatGPT desktop: Sol or Terra, site tools on under Settings →
            Browser. This page never writes to{" "}
            <code className="type-figure text-[13px] text-ink">
              document.modelContext
            </code>
            . Native should read native. Chrome 149+ with{" "}
            <code className="type-figure text-[13px] text-ink">
              chrome://flags/#enable-webmcp-testing
            </code>{" "}
            is the other path.
          </p>
          {support === "page" && ready ? (
            <p>
              This browser has no platform WebMCP, so the tools sit on an
              in-page object for the sparring agent. The platform slot is left
              empty.
            </p>
          ) : null}
          {support !== "native" && probe ? (
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
              <Probe
                label="document.modelContext"
                value={probe.documentOwn}
              />
              <Probe
                label="native found"
                value={probe.nativeFound ? "yes" : "no"}
              />
              <Probe
                label="origin-isolated"
                value={probe.originIsolated ? "yes" : "no"}
              />
              <Probe
                label="secure context"
                value={probe.secureContext ? "yes" : "no"}
              />
            </dl>
          ) : null}
          <p>
            The two boxes on the Arena are HTML forms with{" "}
            <code className="type-figure text-[13px] text-ink">toolname</code>.
            The agent fills them. You press the button. No{" "}
            <code className="type-figure text-[13px] text-ink">
              toolautosubmit
            </code>
            .
          </p>
        </div>
      </details>
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
    } catch (caught) {
      setOutput(
        caught instanceof Error ? caught.message : "The tool call failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => void run()}
          disabled={!tool || running}
          className="type-eyebrow h-8 bg-ink px-3 text-paper disabled:opacity-40"
        >
          {running ? "Running…" : output ? "Run again" : "Run"}
        </button>
        {output ? (
          <button
            type="button"
            onClick={() => setOutput(null)}
            className="type-eyebrow text-graphite hover:text-ink"
          >
            Hide
          </button>
        ) : null}
      </div>
      {output ? (
        <pre className="mt-3 max-h-48 overflow-auto border border-rule bg-leaf p-3 text-[13px] leading-relaxed">
          <code className="whitespace-pre-wrap font-mono text-ink">
            {output}
          </code>
        </pre>
      ) : null}
    </div>
  );
}

function Probe({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="type-figure text-[13px] text-graphite">{label}</dt>
      <dd
        className={cn(
          "type-figure text-[13px]",
          value === "absent" || value === "no" ? "text-pencil" : "text-ink",
        )}
      >
        {value}
      </dd>
    </>
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
          "type-figure mt-1 text-[18px]",
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
