"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyLine } from "@/components/ink/copy-line";
import { JUDGE_CALLS, JUDGE_PROMPT } from "@/lib/judge-path";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useWebMCP } from "@/webmcp/provider";

const CHANNEL_LABEL: Record<string, string> = {
  "browser-agent": "browser",
  "in-page-agent": "in-page",
  founder: "you",
  seat: "seat",
  arena: "arena",
};

/**
 * Floating WebMCP badge on the Arena.
 *
 * The old tool rail ate the board. This sits out of the way, names the
 * protocol, shows live calls, and hands the judge three spoken examples.
 */
export function WebMcpBadge({
  lift = false,
}: {
  /** Sit above the weigh-up dock. */
  lift?: boolean;
}) {
  const { support, registered, ready } = useWebMCP();
  const calls = useArena((state) => state.toolCalls);
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const latest = calls[0] ?? null;
  const live = ready && support === "native";
  const inPage = ready && support === "page";

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col items-end",
        lift ? "bottom-20" : "bottom-5",
      )}
    >
      {open ? (
        <div className="pointer-events-auto mb-2 w-[min(24rem,calc(100vw-2rem))] border border-ink bg-paper shadow-[0_16px_40px_rgba(20,17,15,0.12)]">
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
              {ready ? `${registered.length} tools` : "…"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="type-eyebrow text-graphite hover:text-ink"
            >
              Hide
            </button>
          </header>

          <div className="max-h-[min(28rem,60dvh)] overflow-y-auto px-4 py-3">
            <p className="text-[13px] leading-relaxed text-graphite">
              {live
                ? "This browser exposes the tools natively. ChatGPT can call them."
                : inPage
                  ? "Tools work in this page. Paste the prompt into ChatGPT in Sol or Terra, or ask the in-page agent. Login is not required."
                  : "Tools are not reachable in this browser yet."}
            </p>

            <p className="type-eyebrow mt-4">Paste this in ChatGPT</p>
            <CopyLine text={JUDGE_PROMPT} className="mt-2 px-3 py-2.5" />

            <p className="type-eyebrow mt-4">Then try</p>
            <ul className="mt-2 space-y-2">
              {JUDGE_CALLS.map((item) => (
                <li key={item.tool}>
                  <p className="type-figure text-[13px] text-ink">{item.tool}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-graphite">
                    {item.happens}
                  </p>
                </li>
              ))}
            </ul>

            {calls.length ? (
              <>
                <p className="type-eyebrow mt-4">
                  Calls · {calls.length} this session
                </p>
                <ul className="mt-2 space-y-1.5">
                  {calls.slice(0, 8).map((call) => (
                    <li
                      key={call.id}
                      className="flex items-baseline gap-2 text-[12.5px] leading-snug"
                    >
                      <span
                        className={cn(
                          "mt-[5px] inline-block size-1.5 shrink-0 rounded-full",
                          call.ok ? "bg-moss" : "bg-oxblood",
                        )}
                      />
                      <code
                        className={cn(
                          "type-figure shrink-0",
                          call.ok ? "text-ink" : "text-oxblood",
                        )}
                      >
                        {call.tool}
                      </code>
                      <span className="type-eyebrow shrink-0 text-pencil">
                        {CHANNEL_LABEL[call.channel] ?? call.channel}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-graphite">
                        {call.summary}
                      </span>
                      <span className="type-eyebrow shrink-0 text-pencil">
                        {age(call.at, now)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-[13px] leading-snug text-graphite">
                No calls yet. When ChatGPT runs a tool, it lands here.
              </p>
            )}

            <Link
              href="/webmcp"
              className="type-eyebrow mt-4 inline-block text-ink underline underline-offset-4"
            >
              All tools →
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
            {registered.length}
          </span>
        ) : null}
        {latest && !open ? (
          <span className="type-figure max-w-[10rem] truncate text-[11px] text-paper/70">
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
