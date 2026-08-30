"use client";

import type { Decision, Prediction } from "@/lib/types";

export function DecisionTimeline({
  current,
  history,
  predictions,
}: {
  current: Decision | null;
  history: Decision[];
  predictions: Prediction[];
}) {
  const past = history
    .filter((decision) => decision.id !== current?.id && decision.status === "committed")
    .slice(0, 2);
  const future = current
    ? predictions.filter((prediction) => prediction.decisionId === current.id).slice(0, 1)
    : [];

  return (
    <div className="border border-rule bg-paper px-4 py-4">
      <div className="flex items-baseline justify-between">
        <p className="type-eyebrow">Past</p>
        <p className="type-eyebrow">Now</p>
        <p className="type-eyebrow">Future</p>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-4">
        <div className="absolute inset-x-6 top-2 border-t border-rule" />
        <TimeCell
          label={past[0]?.question ?? "No committed decision yet"}
          mark={past[0] ? "●" : "○"}
        />
        <TimeCell
          label={current?.question ?? "Name the decision"}
          mark="●"
          current
        />
        <TimeCell
          label={
            future[0]
              ? `Bet: ${future[0].expectedValue} ${future[0].unit}`
              : "No prediction yet"
          }
          mark={future[0] ? "●" : "○"}
        />
      </div>
    </div>
  );
}

function TimeCell({
  label,
  mark,
  current,
}: {
  label: string;
  mark: string;
  current?: boolean;
}) {
  return (
    <div className="relative pt-1">
      <p className={current ? "text-ink" : "text-pencil"}>{mark}</p>
      <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink">{label}</p>
    </div>
  );
}
