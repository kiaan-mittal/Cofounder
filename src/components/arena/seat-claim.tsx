"use client";

import { HatchMeter } from "@/components/ink/marks";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { PERSPECTIVE_MAP } from "@/lib/perspectives";
import { cn } from "@/lib/utils";
import type { Argument } from "@/lib/types";

const STANCE: Record<Argument["stance"], { label: string; tone: string }> = {
  for: { label: "FOR", tone: "text-indigo" },
  against: { label: "AGAINST", tone: "text-oxblood" },
  conditional: { label: "ONLY IF", tone: "text-ochre" },
};

const LEVEL: Record<"low" | "medium" | "high", string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function SeatClaim({
  argument,
  selected = false,
  disabled = false,
  onSelect,
}: {
  argument: Argument;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const meta = PERSPECTIVE_MAP[argument.perspective];
  const stance = STANCE[argument.stance];
  const evidence = argument.basis[0]?.label ?? "Uncited";

  const head = (
    <>
      <PerspectiveEmblem
        perspective={argument.perspective}
        className="mt-0.5 size-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="type-eyebrow flex flex-wrap items-baseline gap-x-2">
          <span>{meta?.mark ?? argument.perspective}</span>
          <span className={stance.tone}>{stance.label}</span>
          <span className="type-figure ml-auto text-[13px] text-ink">
            {argument.strength}/100
          </span>
        </p>
        <p className="type-display mt-1.5 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">
          {argument.claim}
        </p>
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "min-w-0 border border-rule bg-paper p-3.5",
        selected && "bg-indigo-wash",
        argument.status === "conceded" && "opacity-60",
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || argument.status === "conceded"}
          className="flex w-full min-w-0 items-start gap-3 text-left disabled:opacity-50"
        >
          {head}
        </button>
      ) : (
        <div className="flex w-full min-w-0 items-start gap-3">{head}</div>
      )}

      <HatchMeter
        value={argument.strength}
        tone={argument.stance === "for" ? "ink" : "oxblood"}
        strokes={12}
        className="mt-3"
        label={`Argument strength ${argument.strength} out of 100`}
      />

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Signal label="Evidence" value={evidence} />
        <Signal label="Risk" value={LEVEL[argument.riskLevel ?? "medium"]} />
        <Signal
          label="Undo"
          value={LEVEL[argument.reversibility ?? "medium"]}
        />
      </dl>
    </article>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="type-eyebrow text-pencil">{label}</dt>
      <dd className="mt-0.5 truncate text-[12.5px] leading-snug text-ink">
        {value}
      </dd>
    </div>
  );
}
