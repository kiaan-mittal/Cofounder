"use client";

import { writeArenaDraft } from "@/lib/drafts";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/types";

const STATUS_TONE: Record<Decision["status"], string> = {
  framing: "text-graphite",
  open: "text-indigo",
  investigating: "text-ochre",
  committed: "text-moss",
  abandoned: "text-oxblood",
};

const STATUS_WASH: Record<Decision["status"], string> = {
  framing: "bg-tape text-graphite",
  open: "bg-indigo-wash text-indigo",
  investigating: "bg-ochre-wash text-ochre",
  committed: "bg-moss-wash text-moss",
  abandoned: "bg-oxblood-wash text-oxblood",
};

export function DecisionRail({
  currentId,
  seed,
}: {
  currentId?: string | null;
  seed?: Decision[];
}) {
  const storeDecisions = useArena((state) => state.decisions);
  const decisions = storeDecisions.length ? storeDecisions : (seed ?? []);
  const setActiveDecision = useArena((state) => state.setActiveDecision);

  function startNew() {
    writeArenaDraft({ question: "", context: "" });
    setActiveDecision(null);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={startNew}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 bg-ink px-3 text-[13px] text-paper transition-colors hover:bg-ink/90"
      >
        <span aria-hidden className="type-figure text-[14px] leading-none">
          +
        </span>
        New arena
      </button>

      {decisions.map((decision) => {
        const active = decision.id === currentId;
        return (
          <button
            key={decision.id}
            type="button"
            onClick={() => setActiveDecision(decision.id)}
            className={cn(
              "inline-flex h-8 max-w-[280px] items-center gap-2 border px-2.5 text-left transition-colors",
              active
                ? "border-ink bg-paper"
                : "border-rule bg-paper text-graphite hover:border-ink hover:text-ink",
            )}
          >
            <span className="truncate text-[13px] leading-none">
              {decision.question}
            </span>
            <span
              className={cn(
                "type-eyebrow shrink-0",
                STATUS_TONE[decision.status],
              )}
            >
              {decision.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function DecisionGallery({
  decisions,
  onOpen,
}: {
  decisions: Decision[];
  onOpen: (id: string) => void;
}) {
  if (!decisions.length) return null;

  return (
    <div>
      <p className="type-eyebrow">Your arenas</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {decisions.map((decision, index) => (
          <li key={decision.id}>
            <button
              type="button"
              onClick={() => onOpen(decision.id)}
              className="group flex h-full w-full flex-col border border-rule bg-leaf p-4 text-left transition-colors hover:border-ink hover:bg-paper"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="type-figure text-[12px] text-pencil">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "type-eyebrow px-1.5 py-0.5",
                    STATUS_WASH[decision.status],
                  )}
                >
                  {decision.status}
                </span>
              </div>
              <p className="type-display mt-3 text-[18px] font-semibold leading-snug">
                {decision.question}
              </p>
              {decision.options.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {decision.options.map((option) => (
                    <span
                      key={option.id}
                      className={cn(
                        "border px-2 py-1 text-[12px]",
                        decision.chosenOptionId === option.id
                          ? "border-ink bg-ink text-paper"
                          : "border-rule text-graphite",
                      )}
                    >
                      {option.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
