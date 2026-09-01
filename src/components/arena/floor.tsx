"use client";

import { useEffect, useMemo, useRef } from "react";

import { AgentTranscript } from "@/components/arena/agent-console";
import { AgentPresence } from "@/components/arena/agent-presence";
import { DecisionBoard } from "@/components/arena/decision-board";
import { DecisionRail } from "@/components/arena/decision-rail";
import { ExportDecision } from "@/components/arena/export-decision";
import { PatternBanner } from "@/components/arena/pattern-banner";
import { PromptComposer } from "@/components/arena/prompt-composer";
import { SeatOpening, SeatReply } from "@/components/arena/seat-reply";
import { SharedState } from "@/components/arena/the-loop";
import { WatchPublisher } from "@/components/arena/watch-publisher";
import { detectPatterns, warningsForDecision } from "@/lib/calibration";
import { PERSPECTIVES, perspectiveName } from "@/lib/perspectives";
import { stillOpenFrom } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { AGENT_PROMPTS, useSparringChat } from "@/lib/use-sparring";
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
  readOnly = false,
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
  readOnly?: boolean;
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
    (!readOnly && sparring.messages.length > 0) ||
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-paper">
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-1.5">
        <p className="type-eyebrow text-indigo">The floor</p>
        <p className="min-w-0 truncate text-[13px] text-graphite">
          {readOnly
            ? "The seats are writing on the other laptop."
            : committed
              ? "The seats wrote this round onto the record."
              : "Don't touch the site. Ask the agent to stress-test the decision."}
        </p>
      </header>
      {readOnly ? null : <PatternBanner warnings={warnings} />}

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7">
        {!hasRecord ? (
          busy ? (
            <p className="type-eyebrow animate-pulse text-oxblood">
              The seats are writing the first arguments.
            </p>
          ) : (
            <p className="text-[15px] leading-relaxed text-graphite">
              {readOnly
                ? "Waiting for the seats. They write on the other laptop."
                : "Say it in ChatGPT: “Use Decision Arena to stress-test whether I should …” The seats write here. You do not have to type."}
            </p>
          )
        ) : (
          <ol className="space-y-8">
            {openings.map((argument) => (
              <li key={argument.id}>
                <SeatOpening argument={argument} className="max-w-none w-full" />
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
                          <SeatReply item={reply} className="max-w-none w-full" />
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

        {sparring.messages.length && !readOnly ? (
          <div className="mt-8 border-t border-rule pt-5">
            <AgentTranscript messages={sparring.messages} />
          </div>
        ) : null}
      </div>

      {readOnly ? (
        <p className="shrink-0 border-t border-rule px-5 py-4 text-[14px] text-graphite">
          Spectating. This tab cannot write.
        </p>
      ) : committed ? (
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
  readOnly = false,
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
  onOpenRound?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-leaf">
      <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-3 border-b border-rule bg-paper px-5 py-1.5">
        <p className="type-eyebrow">The board</p>
        <p className="min-w-0 truncate text-[13px] text-graphite">
          {busy === "opening"
            ? "Seats are writing. The board moves as each one finishes."
            : "Technical, Product, GTM, Financial, Contrarian. Cards move when they speak."}
        </p>
        {busy === "opening" ? (
          <ul className="flex w-full flex-wrap gap-x-3 gap-y-1">
            {PERSPECTIVES.map((seat) => {
              const ready = openingReady.includes(seat.id);
              return (
                <li
                  key={seat.id}
                  className={
                    ready
                      ? "type-eyebrow text-moss"
                      : "type-eyebrow animate-pulse text-pencil"
                  }
                >
                  {seat.mark}
                  {ready ? " · ready" : " · writing"}
                </li>
              );
            })}
          </ul>
        ) : null}
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
            readOnly={readOnly}
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
  decisionId,
  seed,
  spectator = false,
  onCopyWatch,
  agentInRoom = false,
}: {
  question: string;
  round: number;
  status: string;
  decisionId: string;
  seed?: Decision[];
  spectator?: boolean;
  onCopyWatch?: () => void;
  agentInRoom?: boolean;
}) {
  function leave() {
    useArena.getState().setActiveDecision(null);
    scheduleWorkspaceSave();
  }

  return (
    <div
      className="flex h-11 shrink-0 items-center gap-3 border-b border-rule px-3"
      title={question}
    >
      {spectator ? (
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{question}</p>
      ) : (
        <DecisionRail currentId={decisionId} seed={seed} />
      )}
      {spectator ? (
        <p className="type-eyebrow shrink-0 text-oxblood">Spectating</p>
      ) : (
        <button
          type="button"
          onClick={leave}
          className="type-eyebrow shrink-0 text-graphite underline underline-offset-4 hover:text-ink"
        >
          Your arenas
        </button>
      )}
      <div className="flex shrink-0 items-center gap-3">
        {spectator ? (
          agentInRoom ? (
            <p className="type-eyebrow hidden whitespace-nowrap text-oxblood lg:block">
              Agent in the room
            </p>
          ) : null
        ) : (
          <AgentPresence />
        )}
        {spectator ? (
          <button
            type="button"
            onClick={onCopyWatch}
            className="type-eyebrow shrink-0 text-graphite underline underline-offset-4 hover:text-ink"
          >
            Copy watch
          </button>
        ) : (
          <>
            <WatchPublisher compact />
            <ExportDecision decisionId={decisionId} compact />
          </>
        )}
        <p className="type-eyebrow hidden whitespace-nowrap sm:block">
          Round {round} · {status}
        </p>
      </div>
    </div>
  );
}
