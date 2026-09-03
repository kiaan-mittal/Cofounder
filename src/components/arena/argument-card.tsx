"use client";

import { SeatClaim } from "@/components/arena/seat-claim";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Argument, Reassessment } from "@/lib/types";

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
  const conceded = argument.status === "conceded";

  return (
    <div className={cn("relative min-w-0", spotlit && "bg-oxblood-wash")}>
      {spotlit ? (
        <span className="type-eyebrow stamp-in absolute -top-2.5 left-4 z-10 bg-paper px-2 text-oxblood">
          agent moved this
        </span>
      ) : null}

      <SeatClaim
        argument={argument}
        selected={selected}
        disabled={disabled}
        onSelect={onAnswer}
      />

      {reassessments.map((reassessment) => (
        <div
          key={reassessment.id}
          className="border-x border-b border-rule bg-paper px-3.5 py-2.5"
        >
          <p className="type-eyebrow">after your move · {reassessment.verdict}</p>
          <p className="mt-1 truncate text-[13px] leading-snug text-ink">
            {reassessment.addressed}
          </p>
        </div>
      ))}

      {challengedBy.length ? (
        <div className="border-x border-b border-rule bg-paper px-3.5 py-2.5">
          {challengedBy.map((challenge) => (
            <p key={challenge.id} className="truncate text-[13px] leading-snug">
              <span className="type-eyebrow mr-2 text-oxblood">challenged</span>
              {challenge.claim}
            </p>
          ))}
        </div>
      ) : null}

      {composer ? (
        <form
          className="border-x border-b border-rule bg-indigo-wash px-3 py-3"
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
      ) : null}
    </div>
  );
}
