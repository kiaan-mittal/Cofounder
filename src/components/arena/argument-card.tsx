"use client";

import { PerspectiveEmblem } from "@/components/ink/emblems";
import { StanceStamp } from "@/components/ink/table-drawings";
import { HatchMeter, InkRing } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PERSPECTIVE_MAP } from "@/lib/perspectives";
import { cn } from "@/lib/utils";
import type { Argument, Reassessment } from "@/lib/types";

const STANCE_COPY: Record<Argument["stance"], string> = {
  for: "for",
  against: "against",
  conditional: "only if",
};

const STATUS_COPY: Record<Argument["status"], { label: string; tone: string }> = {
  standing: { label: "standing", tone: "text-graphite" },
  weakened: { label: "weakened", tone: "text-indigo" },
  reinforced: { label: "reinforced", tone: "text-oxblood" },
  conceded: { label: "conceded", tone: "text-moss" },
  unresolved: { label: "unresolved", tone: "text-oxblood" },
};

export function ArgumentCard({
  argument,
  reassessments,
  challengedBy,
  spotlit,
  selected,
  onAnswer,
  disabled,
  composer,
}: {
  argument: Argument;
  reassessments: Reassessment[];
  challengedBy: Argument[];
  spotlit: boolean;
  selected?: boolean;
  onAnswer: () => void;
  disabled: boolean;
  composer?: {
    value: string;
    busy: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
  };
}) {
  const meta = PERSPECTIVE_MAP[argument.perspective];
  const status = STATUS_COPY[argument.status];
  const conceded = argument.status === "conceded";
  const open = Boolean(selected || composer);

  return (
    <article
      className={cn(
        "relative min-w-0 w-full bg-paper p-4 transition-colors",
        spotlit && "bg-oxblood-wash",
        selected && !spotlit && "bg-indigo-wash",
        conceded && "opacity-60",
      )}
    >
      {spotlit ? (
        <span className="type-eyebrow stamp-in absolute -top-2.5 left-4 bg-paper px-2 text-oxblood">
          agent moved this
        </span>
      ) : null}

      <button
        type="button"
        onClick={onAnswer}
        disabled={disabled || conceded}
        className="flex min-w-0 w-full items-start gap-3 text-left"
      >
        <PerspectiveEmblem
          perspective={argument.perspective}
          className="mt-0.5 size-14 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="type-eyebrow [overflow-wrap:anywhere]">
            {meta?.name ?? argument.perspective}
            <span className="text-pencil">
              {" "}
              · {STANCE_COPY[argument.stance]}
              {argument.createdBy === "agent" ? " · agent" : ""}
            </span>
          </p>
          <p
            className={cn(
              "type-display mt-1.5 text-[18px] leading-snug [overflow-wrap:anywhere]",
              conceded && "ink-strike",
              !open && "line-clamp-3",
            )}
          >
            {argument.claim}
          </p>
        </div>
        <StanceStamp stance={argument.stance} className="mt-0.5 shrink-0" />
      </button>

      {open ? (
        <p className="mt-3 text-[14px] leading-relaxed text-graphite">
          {argument.reasoning}
        </p>
      ) : null}

      {argument.basis.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {argument.basis.map((basis, index) => (
            <li
              key={`${basis.label}-${index}`}
              className={cn(
                "border px-1.5 py-0.5 type-eyebrow",
                basis.type === "fact" && "border-moss text-moss",
                basis.type === "assumption" && "border-ochre text-ochre",
                basis.type === "pattern" && "border-oxblood text-oxblood",
                basis.type === "inference" && "border-rule text-graphite",
              )}
            >
              {basis.type}
            </li>
          ))}
        </ul>
      ) : null}

      {open
        ? reassessments.map((reassessment) => (
            <div key={reassessment.id} className="mt-4 border-t border-rule pt-3">
              <p className="type-eyebrow">after your move · {reassessment.verdict}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed">
                <span className="type-eyebrow mr-2 text-indigo">answered</span>
                {reassessment.addressed}
              </p>
              {reassessment.verdict !== "conceded" ? (
                <p className="mt-2 text-[13.5px] leading-relaxed">
                  <span className="type-eyebrow mr-2 text-oxblood">
                    still open
                  </span>
                  {reassessment.unaddressed}
                </p>
              ) : null}
            </div>
          ))
        : null}

      {challengedBy.length ? (
        <div className="relative mt-4 border-t border-rule pt-3">
          {challengedBy.map((challenge) => (
            <p key={challenge.id} className="text-[13.5px] leading-relaxed">
              <span className="type-eyebrow mr-2 text-oxblood">challenged</span>
              {challenge.claim}
            </p>
          ))}
          <InkRing className="-inset-x-1 -inset-y-1" />
        </div>
      ) : null}

      {composer ? (
        <form
          className="mt-4 bg-indigo-wash px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            composer.onSubmit();
          }}
        >
          <Textarea
            name="defense"
            value={composer.value}
            onChange={(event) => composer.onChange(event.target.value)}
            placeholder="Write on this card."
            rows={2}
            disabled={composer.busy}
            autoFocus
            className="min-h-[68px] resize-none rounded-none border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={composer.busy || composer.value.trim().length < 3}
              className="h-8 px-3"
            >
              {composer.busy ? "Reassessing…" : "Write this"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={composer.onCancel}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <footer className="mt-3 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="type-eyebrow flex items-baseline justify-between">
              <span className={status.tone}>{status.label}</span>
              <span className="type-figure text-ink">{argument.strength}</span>
            </p>
            <HatchMeter
              value={argument.strength}
              tone={argument.stance === "for" ? "ink" : "oxblood"}
              strokes={12}
              className="mt-1"
              label={`Argument strength ${argument.strength} out of 100`}
            />
          </div>
        </footer>
      )}
    </article>
  );
}
