"use client";

import { useEffect, useMemo, useRef } from "react";

import { AgentTranscript } from "@/components/arena/agent-console";
import { DecisionBoard } from "@/components/arena/decision-board";
import { PatternBanner } from "@/components/arena/pattern-banner";
import { PromptComposer } from "@/components/arena/prompt-composer";
import { SeatOpening, SeatReply } from "@/components/arena/seat-reply";
import { SharedState } from "@/components/arena/the-loop";
import { detectPatterns, warningsForDecision } from "@/lib/calibration";
import { writeArenaDraft } from "@/lib/drafts";
import { PERSPECTIVES, perspectiveName } from "@/lib/perspectives";
import { stillOpenFrom } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { AGENT_PROMPTS, useSparringChat } from "@/lib/use-sparring";
import { founderCall } from "@/webmcp/run";
import type {
  ActionItem,
  Argument,
  Contradiction,
  Decision,
  Defense,
  Evidence,
  Reassessment,
  Risk,
} from "@/lib/types";

export function FloorTalk({
  defenses,
  reassessments,
  arguments: args,
  value,
  busy,
  committed,
  targetLabel,
  onChange,
  onSubmit,
  onClearTarget,
}: {
  defenses: Defense[];
  reassessments: Reassessment[];
  arguments: Argument[];
  value: string;
  busy: boolean;
  committed: boolean;
  targetLabel: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClearTarget: () => void;
}) {
  const sparring = useSparringChat();
  const companyId = useArena((state) => state.company?.id);
  const predictions = useArena((state) => state.predictions);
  const decisions = useArena((state) => state.decisions);
  const storedPatterns = useArena((state) => state.patterns);
  const question = useArena((state) => {
    const id = state.activeDecisionId;
    return state.decisions.find((item) => item.id === id)?.question ?? "";
  });
  const patterns = useMemo(
    () =>
      companyId
        ? detectPatterns(companyId, predictions, decisions)
        : storedPatterns,
    [companyId, predictions, decisions, storedPatterns],
  );
  const warnings = warningsForDecision(question, patterns);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const openings = useMemo(() => {
    const rank = new Map(PERSPECTIVES.map((item, index) => [item.id, index]));
    return args
      .filter((argument) => !argument.challengesId)
      .slice()
      .sort(
        (a, b) =>
          (rank.get(a.perspective) ?? 99) - (rank.get(b.perspective) ?? 99),
      );
  }, [args]);
  const defenseTurns = useMemo(
    () =>
      defenses
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [defenses],
  );
  const hasRecord =
    openings.length > 0 ||
    defenseTurns.length > 0 ||
    sparring.messages.length > 0 ||
    busy;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const follow =
      busy ||
      node.scrollHeight - node.scrollTop - node.clientHeight < 96;
    if (follow) node.scrollTop = node.scrollHeight;
  }, [reassessments, busy, sparring.messages, defenses]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col border-r border-rule bg-paper">
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-2">
        <p className="type-eyebrow text-indigo">The floor</p>
        <p className="min-w-0 truncate text-[13px] text-graphite">
          {committed
            ? "The seats wrote this round onto the record."
            : "The board moves when they answer."}
        </p>
      </header>
      <PatternBanner warnings={warnings} />

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {!hasRecord ? (
          <p className="text-[15px] leading-relaxed text-graphite">
            Your first line opens the floor.
          </p>
        ) : (
          <ol className="space-y-8">
            {openings.map((argument) => (
              <li key={argument.id}>
                <SeatOpening argument={argument} />
              </li>
            ))}
            {defenseTurns.map((item) => {
              const replies = reassessments.filter(
                (entry) => entry.defenseId === item.id,
              );
              return (
                <li key={item.id}>
                  <p className="type-eyebrow text-indigo">You</p>
                  <p className="mt-2 max-w-[52ch] text-[17px] leading-relaxed text-ink">
                    {item.text}
                  </p>
                  {replies.length ? (
                    <ol className="mt-5 space-y-4">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <SeatReply item={reply} />
                        </li>
                      ))}
                    </ol>
                  ) : busy && item.id === defenseTurns[defenseTurns.length - 1]?.id ? (
                    <p className="type-eyebrow mt-5 animate-pulse text-oxblood">
                      The seats are writing…
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {sparring.messages.length ? (
          <div className="mt-8 border-t border-rule pt-5">
            <AgentTranscript messages={sparring.messages} />
          </div>
        ) : null}
      </div>

      {committed ? (
        <p className="shrink-0 border-t border-rule px-5 py-4 text-[14px] text-graphite">
          This decision is committed.
        </p>
      ) : (
        <div className="shrink-0 border-t border-rule">
          <PromptComposer
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            busy={busy}
            placeholder="What do you actually believe? The seats will answer on the record."
            submitLabel="Write"
            busyLabel="Hearing them…"
            hint="One honest paragraph. The seats reassess from this."
            targetLabel={targetLabel}
            onClearTarget={onClearTarget}
            allowAgent
            onAgentSubmit={(goal, display) => void sparring.run(goal, display)}
            agentBusy={sparring.running}
            onAgentStop={sparring.stop}
            agentSuggestions={AGENT_PROMPTS}
          />
        </div>
      )}
    </div>
  );
}

export function FloorBoard({
  decision,
  companyName,
  args,
  reassessments,
  risks,
  evidence,
  contradictions,
  actionItems,
  spotlightId,
  busy,
  openingReady,
  defense,
  target,
  onDefenseChange,
  onTarget,
  onSubmitDefense,
  onOpenRound,
}: {
  decision: Decision;
  companyName: string;
  args: Argument[];
  reassessments: Reassessment[];
  risks: Risk[];
  evidence: Evidence[];
  contradictions: Contradiction[];
  actionItems: ActionItem[];
  spotlightId: string | null;
  busy: "opening" | "defending" | "readiness" | null;
  openingReady: import("@/lib/types").PerspectiveId[];
  defense: string;
  target: string | null;
  onDefenseChange: (value: string) => void;
  onTarget: (argumentId: string | null) => void;
  onSubmitDefense: () => void;
  onOpenRound: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-leaf">
      <header className="shrink-0 border-b border-rule bg-paper px-5 py-3">
        <p className="type-eyebrow">The board</p>
        <p className="mt-1 text-[13.5px] text-graphite">
          Technical, Product, GTM, Financial, Contrarian. Cards move when they
          speak.
        </p>
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <SharedState
          risks={risks}
          contradictions={contradictions}
          evidence={evidence}
          stillOpen={stillOpenFrom(reassessments)}
          stacked
        />
        <div className="border-t border-rule">
          <DecisionBoard
            decision={decision}
            companyName={companyName}
            args={args}
            reassessments={reassessments}
            risks={risks}
            evidence={evidence}
            contradictions={contradictions}
            actionItems={actionItems}
            spotlightId={spotlightId}
            busy={busy}
            openingReady={openingReady}
            defense={defense}
            target={target}
            onDefenseChange={onDefenseChange}
            onTarget={onTarget}
            onSubmitDefense={onSubmitDefense}
            onOpenRound={onOpenRound}
            cardsOnly
          />
        </div>
      </div>
    </div>
  );
}

export function targetSeatLabel(
  args: Argument[],
  targetId: string | null,
): string | null {
  if (!targetId) return null;
  const argument = args.find((item) => item.id === targetId);
  if (!argument) return null;
  return perspectiveName(argument.perspective);
}

export function FloorBar({
  question,
  round,
  status,
}: {
  question: string;
  round: number;
  status: string;
}) {
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

  function leave() {
    founderCall("set_active_decision", { list: true });
    scheduleWorkspaceSave();
  }

  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-rule px-4 py-2.5">
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
      <button
        type="button"
        onClick={leave}
        className="type-eyebrow text-graphite underline underline-offset-4 hover:text-ink"
      >
        Your arenas
      </button>
      <p className="min-w-0 flex-1 truncate type-display text-[17px] font-semibold">
        {question}
      </p>
      <p className="type-eyebrow shrink-0">
        Round {round} · {status}
      </p>
    </div>
  );
}
