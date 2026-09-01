"use client";

import { useArena } from "@/lib/store";

const AGENT: Set<string> = new Set(["browser-agent", "in-page-agent"]);

/** Lights when a browser agent just wrote. The sixth chair, occupied. */
export function AgentPresence() {
  const latest = useArena((state) => state.toolCalls[0]);
  if (!latest || !AGENT.has(latest.channel)) return null;
  const age = Date.now() - new Date(latest.at).getTime();
  if (age > 120_000) return null;

  return (
    <p className="type-eyebrow hidden whitespace-nowrap text-oxblood lg:block">
      Agent in the room
    </p>
  );
}
