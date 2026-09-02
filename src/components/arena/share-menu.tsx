"use client";

import { useEffect, useRef, useState } from "react";

import { ExportDecision } from "@/components/arena/export-decision";
import { WatchPublisher } from "@/components/arena/watch-publisher";

/**
 * Watch, share link, Slack, and Notion live behind one control so the
 * floor bar stays a single quiet row.
 */
export function ShareMenu({ decisionId }: { decisionId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="type-eyebrow h-8 px-2 text-graphite hover:text-ink"
      >
        Share
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-52 border border-rule bg-paper py-1 shadow-[0_12px_28px_rgba(20,17,15,0.1)]"
        >
          <WatchPublisher variant="menu" />
          <ExportDecision decisionId={decisionId} variant="menu" />
        </div>
      ) : null}
    </div>
  );
}
