"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useWebMCP } from "@/webmcp/provider";
import { TOOL_SUMMARIES } from "@/webmcp/tools";

const CHANNEL_LABEL: Record<string, string> = {
  "browser-agent": "guest",
  "in-page-agent": "in-page",
  founder: "you",
  seat: "dissenter",
  arena: "floor",
};

/**
 * Floating WebMCP badge on the floor.
 *
 * Opens itself on the first call so a judge can see what the agent did
 * without hunting. Native vs fallback, live calls, no second ChatGPT prompt.
 */
export function WebMcpBadge({
  lift = false,
}: {
  /** Sit above the weigh-up dock. */
  lift?: boolean;
}) {
  const { support, registered, ready } = useWebMCP();
  const calls = useArena((state) => state.toolCalls);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const seen = useRef(0);

  useEffect(() => {
    if (calls.length > 0 && seen.current === 0) {
      setOpen(true);
    }
    seen.current = calls.length;
  }, [calls.length]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const latest = calls[0] ?? null;
  const live = ready && support === "native";
  const inPage = ready && support === "page";
  const timeline = [...calls].slice(0, 16).reverse();

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 z-50 flex max-w-[min(26rem,calc(100vw-2rem))] flex-col items-end",
        lift ? "bottom-20" : "bottom-5",
      )}
    >
      {open ? (
        <div className="pointer-events-auto mb-2 w-[min(26rem,calc(100vw-2rem))] border border-ink bg-paper shadow-[0_16px_40px_rgba(20,17,15,0.12)]">
          <header className="flex items-center gap-3 border-b border-rule px-4 py-2.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                live ? "bg-moss" : inPage ? "bg-ochre" : "bg-pencil",
              )}
            />
            <p className="type-display text-[18px] font-semibold leading-none">
              WebMCP
            </p>
            <p className="type-eyebrow ml-auto">
              {ready
                ? live
                  ? `native · ${registered.length}`
                  : inPage
                    ? `fallback · ${registered.length}`
                    : "waiting"
                : "…"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="type-eyebrow text-graphite hover:text-ink"
            >
              Hide
            </button>
          </header>

          <div className="max-h-[min(32rem,62dvh)] overflow-y-auto px-4 py-3">
            <p className="text-[13px] leading-relaxed text-graphite">
              {live
                ? "Native site tools. ChatGPT discovered document.modelContext on this page."
                : inPage
                  ? "In-page tools. For native site tools, open this URL in ChatGPT desktop Sol or Terra (site tools on)."
                  : "Waiting for document.modelContext. Open the page in Sol, Terra, or Chrome with the WebMCP flag."}
            </p>

            {calls.length ? (
              <>
                <p className="type-eyebrow mt-4">What the agent did</p>
                <p className="mt-1 text-[12.5px] leading-snug text-graphite">
                  {calls.length} call{calls.length === 1 ? "" : "s"} this
                  session, oldest first.
                </p>
                <ol className="mt-3 space-y-2.5">
                  {timeline.map((call, index) => (
                    <li
                      key={call.id}
                      className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-x-2 text-[12.5px] leading-snug"
                    >
                      <span className="type-figure pt-0.5 text-pencil">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <code
                            className={cn(
                              "type-figure",
                              call.ok ? "text-ink" : "text-oxblood",
                            )}
                          >
                            {call.tool}
                          </code>
                          <span className="type-eyebrow text-pencil">
                            {CHANNEL_LABEL[call.channel] ?? call.channel}
                          </span>
                        </p>
                        <p className="mt-0.5 text-graphite">
                          {call.summary ||
                            TOOL_SUMMARIES[call.tool] ||
                            "Called."}
                        </p>
                      </div>
                      <span className="type-eyebrow shrink-0 pt-0.5 text-pencil">
                        {age(call.at, now)}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="mt-4 text-[13px] leading-snug text-graphite">
                No calls yet. When ChatGPT runs a tool, it lands here, in order.
              </p>
            )}

            <Link
              href="/webmcp"
              className="type-eyebrow mt-4 inline-block text-ink underline underline-offset-4"
            >
              All 17 tools →
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto inline-flex items-center gap-2.5 border border-ink bg-ink px-3.5 py-2 text-paper shadow-[0_12px_28px_rgba(20,17,15,0.18)]"
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            live ? "bg-moss" : inPage ? "bg-ochre" : "bg-pencil",
          )}
        />
        <span className="type-display text-[15px] font-semibold leading-none">
          WebMCP
        </span>
        {ready ? (
          <span className="type-figure text-[12px] text-paper/70">
            {live ? "native" : inPage ? "fallback" : "off"}
            {registered.length ? ` · ${registered.length}` : ""}
          </span>
        ) : null}
        {latest && !open ? (
          <span
            className={cn(
              "type-figure max-w-[10rem] truncate text-[11px]",
              latest.ok ? "text-paper/70" : "text-ochre",
            )}
          >
            {latest.tool}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function age(at: string, now: number) {
  const origin = now || Date.now();
  const seconds = Math.max(
    0,
    Math.round((origin - new Date(at).getTime()) / 1000),
  );
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}
