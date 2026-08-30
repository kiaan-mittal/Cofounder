"use client";

import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FounderPattern, PatternAlert } from "@/lib/types";

export function PatternBanner({
  warnings,
  className,
}: {
  warnings: FounderPattern[];
  className?: string;
}) {
  const alerts = useArena((state) => state.patternAlerts);
  const dismiss = useArena((state) => state.dismissPatternAlert);

  const live = alerts[0] ?? null;
  const fallback = warnings[0] ?? null;
  const showWarning =
    Boolean(fallback) && (!live || live.body !== fallback?.insight);

  if (!live && !showWarning) return null;

  return (
    <aside
      className={cn(
        "shrink-0 border-b border-ochre bg-ochre-wash",
        className,
      )}
    >
      {live ? (
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="type-eyebrow text-ochre">{live.title}</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
              {live.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(live.id)}
            className="type-eyebrow shrink-0 text-graphite underline underline-offset-4 hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {showWarning && fallback ? (
        <div
          className={cn(
            "px-4 py-3",
            live && "border-t border-ochre/40",
          )}
        >
          <p className="type-eyebrow text-ochre">Calibration warning</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
            {fallback.insight}
          </p>
        </div>
      ) : null}
    </aside>
  );
}

export function PatternAlertList({
  alerts,
}: {
  alerts: PatternAlert[];
}) {
  const dismiss = useArena((state) => state.dismissPatternAlert);
  if (alerts.length === 0) return null;
  return (
    <ol className="space-y-2">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className="border border-ochre bg-ochre-wash px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="type-eyebrow text-ochre">{alert.title}</p>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="type-eyebrow text-graphite underline underline-offset-4"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">
            {alert.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
