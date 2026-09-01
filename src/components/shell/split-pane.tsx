"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "da-split:";

export function SplitPane({
  storageKey,
  defaultPct = 58,
  minPct = 32,
  maxPct = 74,
  left,
  right,
}: {
  storageKey: string;
  defaultPct?: number;
  minPct?: number;
  maxPct?: number;
  left: ReactNode;
  right: ReactNode;
}) {
  const [pct, setPct] = useState(defaultPct);
  const shell = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const labelId = useId();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (!stored) return;
      const next = Number(stored);
      if (Number.isFinite(next)) {
        setPct(Math.min(maxPct, Math.max(minPct, next)));
      }
    } catch {
      /* private mode */
    }
  }, [maxPct, minPct, storageKey]);

  const persist = useCallback(
    (value: number) => {
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, String(value));
      } catch {
        /* private mode */
      }
    },
    [storageKey],
  );

  const move = useCallback(
    (clientX: number) => {
      const node = shell.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      if (box.width < 8) return;
      const next = Math.min(
        maxPct,
        Math.max(minPct, ((clientX - box.left) / box.width) * 100),
      );
      setPct(next);
      persist(next);
    },
    [maxPct, minPct, persist],
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      move(event.clientX);
    }
    function onUp() {
      dragging.current = false;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [move]);

  function onHandleDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    move(event.clientX);
  }

  return (
    <div
      ref={shell}
      className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row"
      style={{ ["--split-pct" as string]: `${pct}%` }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-rule lg:w-[var(--split-pct)] lg:flex-none lg:border-b-0">
        {left}
      </div>
      <div
        role="separator"
        aria-labelledby={labelId}
        aria-orientation="vertical"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={minPct}
        aria-valuemax={maxPct}
        tabIndex={0}
        onPointerDown={onHandleDown}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            const next = Math.max(minPct, pct - 2);
            setPct(next);
            persist(next);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            const next = Math.min(maxPct, pct + 2);
            setPct(next);
            persist(next);
          }
        }}
        className={cn(
          "relative hidden w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center lg:flex",
          "hover:bg-tape focus-visible:bg-tape focus-visible:outline-none",
        )}
      >
        <span id={labelId} className="sr-only">
          Resize the floor and the board
        </span>
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-rule" />
        <span className="absolute left-1/2 top-1/2 flex h-12 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <span className="flex h-9 w-2 flex-col items-center justify-center gap-[3px] border border-rule bg-paper">
            <span className="block h-0.5 w-0.5 rounded-full bg-ink" />
            <span className="block h-0.5 w-0.5 rounded-full bg-ink" />
            <span className="block h-0.5 w-0.5 rounded-full bg-ink" />
          </span>
        </span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{right}</div>
    </div>
  );
}
