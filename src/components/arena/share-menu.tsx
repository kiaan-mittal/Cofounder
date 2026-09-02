"use client";

import { useEffect, useRef, useState } from "react";

import { ExportDecision } from "@/components/arena/export-decision";
import { WatchPublisher } from "@/components/arena/watch-publisher";
import { useArena } from "@/lib/store";

const SHARE_URL_RE = /https?:\/\/\S+/;

/**
 * Slack and Notion sit as logos on the quiet floor bar. Watch and the
 * share link stay behind Share so the row does not grow another cluster
 * of labeled buttons. After share_decision, the public URL sits beside it.
 */
export function ShareMenu({ decisionId }: { decisionId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const shareUrl = useArena((state) => {
    const call = state.toolCalls.find(
      (item) => item.tool === "share_decision" && item.ok,
    );
    const match = call?.summary.match(SHARE_URL_RE);
    return match?.[0]?.replace(/[.,;:]+$/, "") ?? null;
  });

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
    <div className="flex items-center gap-2">
      <ExportDecision decisionId={decisionId} variant="logos" />
      {shareUrl ? (
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="type-eyebrow hidden max-w-[14rem] truncate text-moss underline underline-offset-4 lg:inline"
        >
          Public link
        </a>
      ) : null}
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
            {shareUrl ? (
              <a
                role="menuitem"
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center px-3 text-[13px] text-moss hover:bg-tape"
              >
                Open public link
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
