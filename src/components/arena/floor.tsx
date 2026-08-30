"use client";

import { AgentTranscript } from "@/components/arena/agent-console";
import { DecisionBoard } from "@/components/arena/decision-board";
import { PromptComposer } from "@/components/arena/prompt-composer";
import { SharedState } from "@/components/arena/the-loop";
import { perspectiveName } from "@/lib/perspectives";
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

export function seatReply(item: Reassessment) {
  if (item.reply?.trim()) return item.reply.trim();
  return [item.addressed, item.unaddressed].filter(Boolean).join("\n\n");
}

export function FloorTalk({
  defenses,
  reassessments,
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
  value: string;
  busy: boolean;
  committed: boolean;
  targetLabel: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClearTarget: () => void;
}) {
  const sparring = useSparringChat();

  return (
    <div className="flex min-h-0 min-w-0 flex-col border-r border-rule bg-paper">
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-2">
        <p className="type-eyebrow text-indigo">You</p>
        <p className="text-[13px] text-graphite">
          The board moves when they answer.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {defenses.length === 0 && !busy && sparring.messages.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-graphite">
            Your first line opens the floor.
          </p>
        ) : (
          <ol className="space-y-8">
            {defenses.map((item) => {
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
                    <ol className="mt-5 space-y-6">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <p className="type-eyebrow text-oxblood">
                            {perspectiveName(reply.perspective)}
                            <span className="text-pencil">
                              {" "}
                              · {reply.verdict}
                            </span>
                          </p>
                          <p className="mt-2 max-w-[54ch] whitespace-pre-wrap text-[16px] leading-[1.55] text-ink">
                            {seatReply(reply)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              );
            })}
            {busy ? (
              <li className="type-eyebrow animate-pulse text-oxblood">
                The seats are writing…
              </li>
            ) : null}
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

export function BriefingWrite({
  value,
  busy,
  onChange,
  onSubmit,
}: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="mt-8 border border-rule">
      <header className="border-b border-rule px-5 py-4">
        <p className="type-eyebrow text-indigo">Your defense</p>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-graphite">
          Write what you actually believe. The floor opens. They answer on the
          left. The board on the right changes.
        </p>
      </header>
      <PromptComposer
        variant="briefing"
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        busy={busy}
        placeholder="Should I launch now, or is this still a bet I cannot afford?"
        submitLabel="Open the floor"
        busyLabel="Opening the floor…"
        hint="One honest paragraph is enough to start."
      />
    </section>
  );
}

export function FloorBar({
  question,
  round,
  status,
  onLeave,
}: {
  question: string;
  round: number;
  status: string;
  onLeave: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-rule px-4 py-2.5">
      <button
        type="button"
        onClick={onLeave}
        className="type-eyebrow text-graphite underline underline-offset-4 hover:text-ink"
      >
        The decision
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

export function floorFocused(defenses: Defense[], busy: boolean) {
  return defenses.length > 0 || busy;
}
