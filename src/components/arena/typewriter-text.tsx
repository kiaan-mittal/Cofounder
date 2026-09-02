"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal text the way a chat model does: characters land one after another.
 * When the source string grows (SSE partials), this chases it. When the
 * source is replaced, it restarts. When the stream ends, leftover characters
 * catch up quickly instead of jumping.
 */
export function TypewriterText({
  text,
  active = true,
  cps = 64,
}: {
  text: string;
  active?: boolean;
  cps?: number;
}) {
  const [shown, setShown] = useState(() => (active ? "" : text));
  const shownRef = useRef(active ? "" : text);
  const targetRef = useRef(text);
  const activeRef = useRef(active);

  useEffect(() => {
    targetRef.current = text;
    activeRef.current = active;
    const current = shownRef.current;
    if (text.startsWith(current) || current.startsWith(text)) return;
    shownRef.current = "";
    setShown("");
  }, [text, active]);

  useEffect(() => {
    if (!active && shownRef.current === text) {
      setShown(text);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const target = targetRef.current;
      const current = shownRef.current;
      if (current === target) {
        if (!activeRef.current) return;
        last = now;
        frame = window.requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(48, now - last);
      last = now;
      const behind = Math.max(0, target.length - current.length);
      const catchUp = !activeRef.current || behind > 48;
      const rate = catchUp ? Math.max(cps, 180) : cps;
      const n = Math.max(1, Math.round((rate * dt) / 1000));
      const next = target.slice(0, current.length + n);
      shownRef.current = next;
      setShown(next);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [text, active, cps]);

  return <>{shown}</>;
}
