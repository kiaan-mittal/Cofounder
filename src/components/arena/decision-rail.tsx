"use client";

import { writeArenaDraft } from "@/lib/drafts";
import { PERSPECTIVES } from "@/lib/perspectives";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/types";
import { founderCall } from "@/webmcp/run";

const STATUS_WASH: Record<Decision["status"], string> = {
  framing: "bg-tape text-graphite",
  open: "bg-indigo-wash text-indigo",
  investigating: "bg-ochre-wash text-ochre",
  committed: "bg-moss-wash text-moss",
  abandoned: "bg-oxblood-wash text-oxblood",
};

const STATUS_DOT: Record<Decision["status"], string> = {
  framing: "bg-pencil",
  open: "bg-indigo",
  investigating: "bg-ochre",
  committed: "bg-moss",
  abandoned: "bg-oxblood",
};

const CARD_WASH: Record<Decision["status"], string> = {
  framing: "bg-paper",
  open: "bg-indigo-wash",
  investigating: "bg-ochre-wash",
  committed: "bg-moss-wash",
  abandoned: "bg-oxblood-wash",
};

export function DecisionRail({
  currentId,
  seed,
  onNew,
  showNew = true,
}: {
  currentId?: string | null;
  seed?: Decision[];
  onNew?: () => void;
  showNew?: boolean;
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
      {showNew ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={startNew}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 bg-ink px-3 text-[13px] text-paper transition-colors hover:bg-ink/90"
        >
          <span aria-hidden className="type-figure text-[14px] leading-none">
            +
          </span>
          New decision
        </button>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {decisions.map((decision) => {
          const active = decision.id === currentId;
          return (
            <button
              key={decision.id}
              type="button"
              title={decision.question}
              onClick={() => openDecision(decision.id)}
              className={cn(
                "inline-flex h-7 max-w-[11rem] shrink-0 items-center gap-1.5 whitespace-nowrap px-2 text-left transition-colors",
                active
                  ? "bg-tape text-ink"
                  : "text-graphite hover:bg-tape/70 hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  STATUS_DOT[decision.status],
                )}
              />
              <span className="truncate text-[13px] leading-none">
                {railTitle(decision.question)}
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
  companyName,
}: {
  decisions: Decision[];
  onOpen: (id: string) => void;
  companyName?: string;
}) {
  const argumentList = useArena((state) => state.argumentList);

  function startNew() {
    writeArenaDraft({ question: "", context: "" });
    const api = useArena.getState();
    if (typeof api.beginNewArena === "function") {
      api.beginNewArena();
    } else {
      api.setActiveDecision(null);
    }
    scheduleWorkspaceSave();
  }

  if (!decisions.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="type-eyebrow">Your decisions</p>
          {companyName ? (
            <p className="mt-1 truncate text-[13px] text-graphite">{companyName}</p>
          ) : null}
        </div>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={startNew}
          className="type-eyebrow text-ink hover:underline"
        >
          + New
        </button>
      </div>
      <ul className="mt-4 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
          const preview = bySeat.slice(0, 3);
          return (
            <li key={decision.id} className="min-h-0">
              <button
                type="button"
                onClick={() => onOpen(decision.id)}
                className={cn(
                  "flex h-full min-h-[16rem] flex-col border border-rule p-5 text-left transition-colors hover:border-ink",
                  CARD_WASH[decision.status],
                )}
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
                <p className="type-display mt-3 line-clamp-3 text-[18px] font-semibold leading-snug">
                  {decision.question}
                </p>
                {decision.context ? (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-graphite">
                    {decision.context}
                  </p>
                ) : null}
                {preview.length ? (
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {preview.map((argument) => (
                      <li
                        key={argument.id}
                        className="line-clamp-2 text-[13px] leading-snug text-graphite"
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
                  <p className="mt-3 flex-1 text-[13px] leading-snug text-pencil">
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
