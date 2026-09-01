"use client";

import { useEffect, useState } from "react";

import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Channels that mean something outside this tab reached in and wrote. */
const AGENT: Set<string> = new Set(["browser-agent", "in-page-agent"]);

const CHANNEL_LABEL: Record<string, string> = {
  "browser-agent": "browser",
  "in-page-agent": "in-page",
  founder: "you",
  seat: "seat",
};

/**
 * The tool traffic, on the floor rather than buried on /webmcp.
 *
 * Every call the seats, the sparring agent or a browser agent make already
 * lands in the store; this is the only place a spectator can watch them arrive
 * while the decision is being argued. Refusals are the point as much as the
 * successes — a refused commit is the app working, so it reads in oxblood
 * rather than being hidden as an error.
 */
export function ToolRail() {
  const calls = useArena((state) => state.toolCalls);
  const [open, setOpen] = useState(true);

  // Ages are rendered as "just now" / "12s", so re-render while the rail is
  // visible rather than letting the newest call read as fresh forever.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!open || !calls.length) return;
    const timer = window.setInterval(() => tick((n) => n + 1), 5_000);
    return () => window.clearInterval(timer);
  }, [open, calls.length]);

  if (!calls.length) return null;

  const recent = calls.slice(0, 6);
  const agentCalls = calls.filter((call) => AGENT.has(call.channel)).length;

  return (
    <section className="shrink-0 border-b border-rule bg-paper">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-baseline gap-3 px-5 py-1.5 text-left"
      >
        <span className="type-eyebrow">Tool calls</span>
        <span className="type-eyebrow text-graphite">
          {calls.length} this session
          {agentCalls ? ` · ${agentCalls} from an agent` : ""}
        </span>
        <span className="type-eyebrow ml-auto text-graphite">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <ul className="max-h-40 overflow-y-auto px-5 pb-2">
          {recent.map((call) => (
            <li
              key={call.id}
              className="flex items-baseline gap-2 py-[3px] text-[11.5px] leading-relaxed"
            >
              <span
                className={cn(
                  "mt-[5px] inline-block size-1.5 shrink-0 rounded-full",
                  call.ok ? "bg-moss" : "bg-oxblood",
                )}
              />
              <span
                className={cn(
                  "type-figure shrink-0",
                  call.ok ? "text-ink" : "text-oxblood",
                )}
              >
                {call.tool}
              </span>
              <span className="type-eyebrow shrink-0 text-pencil">
                {CHANNEL_LABEL[call.channel] ?? call.channel}
              </span>
              <span className="min-w-0 flex-1 truncate text-graphite">
                {call.summary}
              </span>
              <span className="type-eyebrow shrink-0 text-pencil">
                {age(call.at)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function age(at: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}
