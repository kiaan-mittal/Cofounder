"use client";

import { writeArenaDraft } from "@/lib/drafts";
import { PERSPECTIVES } from "@/lib/perspectives";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/types";
import { founderCall } from "@/webmcp/run";

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
  onNew,
}: {
  currentId?: string | null;
  seed?: Decision[];
  onNew?: () => void;
}) {
  const storeDecisions = useArena((state) => state.decisions);
  const decisions = storeDecisions.length ? storeDecisions : (seed ?? []);

  function startNew() {
    writeArenaDraft({ question: "", context: "" });
    const api = useArena.getState();
    if (typeof api.beginNewArena === "function") {
      api.beginNewArena();
    } else {
      api.setActiveDecision(null);
    }
    scheduleWorkspaceSave();
    onNew?.();
  }

  function openDecision(id: string) {
    useArena.getState().setActiveDecision(id);
    scheduleWorkspaceSave();
    void founderCall("open_saved_decision", { decision_id: id });
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={startNew}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 bg-ink px-3 text-[13px] text-paper transition-colors hover:bg-ink/90"
      >
        <span aria-hidden className="type-figure text-[14px] leading-none">
          +
        </span>
        New arena
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {decisions.map((decision) => {
          const active = decision.id === currentId;
          return (
            <button
              key={decision.id}
              type="button"
              onClick={() => openDecision(decision.id)}
              className={cn(
                "inline-flex h-8 max-w-[13.5rem] shrink-0 items-center gap-2 whitespace-nowrap border px-2.5 text-left transition-colors",
                active
                  ? "border-ink bg-paper"
                  : "border-rule bg-paper text-graphite hover:border-ink hover:text-ink",
              )}
            >
              <span className="truncate text-[13px] leading-none">
                {railTitle(decision.question)}
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
    </div>
  );
}

function railTitle(question: string) {
  const cut = question.replace(/\?$/, "").trim();
  const first = cut.split(/,|\bor\b/)[0]?.trim() ?? cut;
  return first;
}

export function DecisionGallery({
  decisions,
  onOpen,
}: {
  decisions: Decision[];
  onOpen: (id: string) => void;
}) {
  const argumentList = useArena((state) => state.argumentList);

  if (!decisions.length) return null;

  return (
    <div>
      <p className="type-eyebrow">Your arenas</p>
      <ul className="mt-4 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {decisions.map((decision, index) => {
          const seats = argumentList.filter(
            (argument) =>
              argument.decisionId === decision.id && !argument.challengesId,
          );
          const bySeat = PERSPECTIVES.map((perspective) =>
            seats.find((argument) => argument.perspective === perspective.id),
          ).filter((argument): argument is NonNullable<typeof argument> =>
            Boolean(argument),
          );
          return (
            <li
              key={decision.id}
              className="flex flex-col border border-rule bg-leaf transition-colors hover:border-ink hover:bg-paper"
            >
              <button
                type="button"
                onClick={() => onOpen(decision.id)}
                className="flex min-h-0 flex-1 flex-col p-4 text-left"
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
                {bySeat.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {bySeat.map((argument) => (
                      <li
                        key={argument.id}
                        className="text-[13px] leading-snug text-graphite"
                      >
                        <span className="type-eyebrow mr-1.5 text-oxblood">
                          {PERSPECTIVES.find(
                            (item) => item.id === argument.perspective,
                          )?.mark}
                        </span>
                        {argument.claim}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13px] leading-snug text-pencil">
                    The seats have not written yet.
                  </p>
                )}
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
          );
        })}
      </ul>
    </div>
  );
}
