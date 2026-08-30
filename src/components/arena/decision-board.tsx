"use client";

import { ArgumentCard } from "@/components/arena/argument-card";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import {
  BalanceSketch,
  ObjectMark,
  TableSketch,
} from "@/components/ink/table-drawings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PERSPECTIVES } from "@/lib/perspectives";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type {
  ActionItem,
  Argument,
  Contradiction,
  Decision,
  Evidence,
  PerspectiveId,
  Reassessment,
  Risk,
} from "@/lib/types";

export function DecisionBoard({
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
  openingReady: PerspectiveId[];
  defense: string;
  target: string | null;
  onDefenseChange: (value: string) => void;
  onTarget: (argumentId: string | null) => void;
  onSubmitDefense: () => void;
  onOpenRound: () => void;
}) {
  const challengesByTarget = new Map<string, Argument[]>();
  for (const argument of args) {
    if (!argument.challengesId) continue;
    const list = challengesByTarget.get(argument.challengesId) ?? [];
    list.push(argument);
    challengesByTarget.set(argument.challengesId, list);
  }

  const primary = args.filter((argument) => !argument.challengesId);
  const opening = busy === "opening";
  const committed = decision.status === "committed";
  const empty = primary.length === 0 && !opening;
  const filled = [...new Set(primary.map((argument) => argument.perspective))];
  const writing = PERSPECTIVES.map((item) => item.id).filter(
    (id) => opening && !openingReady.includes(id) && !filled.includes(id),
  );

  return (
    <section className="border border-rule bg-leaf">
      <PresenceStrip
        companyName={companyName}
        busy={busy}
        spotlightId={spotlightId}
        agentWriting={opening}
      />

      <div className="paper-grid border-b border-rule px-4 pb-2 pt-4">
        <TableSketch
          writing={writing}
          ready={openingReady}
          filled={filled}
        />
        <ul className="mt-1 flex justify-between px-2 sm:px-8">
          {PERSPECTIVES.map((perspective) => (
            <li key={perspective.id} className="flex flex-col items-center gap-1">
              <PerspectiveEmblem
                perspective={perspective.id}
                className="size-8 sm:size-10"
              />
              <span className="type-eyebrow hidden sm:block">{perspective.mark}</span>
            </li>
          ))}
        </ul>
      </div>

      <TensionScale arguments={primary} />

      {empty ? (
        <EmptyTable busy={busy} onOpenRound={onOpenRound} />
      ) : (
        <div className="grid gap-px bg-rule sm:grid-cols-2 xl:grid-cols-3">
          {primary.map((argument) => (
            <ArgumentCard
              key={argument.id}
              argument={argument}
              reassessments={reassessments.filter(
                (item) => item.argumentId === argument.id,
              )}
              challengedBy={challengesByTarget.get(argument.id) ?? []}
              spotlit={spotlightId === argument.id}
              selected={target === argument.id}
              onAnswer={() =>
                onTarget(target === argument.id ? null : argument.id)
              }
              disabled={busy !== null || committed}
              composer={
                target === argument.id && !committed
                  ? {
                      value: defense,
                      busy: busy === "defending",
                      onChange: onDefenseChange,
                      onSubmit: onSubmitDefense,
                      onCancel: () => onTarget(null),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <TableObjects
        contradictions={contradictions}
        risks={risks}
        evidence={evidence}
        actionItems={actionItems}
        spotlightId={spotlightId}
      />

      {!committed && !empty && target === null ? (
        <RoundComposer
          value={defense}
          busy={busy === "defending"}
          onChange={onDefenseChange}
          onSubmit={onSubmitDefense}
        />
      ) : null}
    </section>
  );
}

function PresenceStrip({
  companyName,
  busy,
  spotlightId,
  agentWriting,
}: {
  companyName: string;
  busy: "opening" | "defending" | "readiness" | null;
  spotlightId: string | null;
  agentWriting: boolean;
}) {
  const toolCalls = useArena((state) => state.toolCalls);
  const lastTool = toolCalls[0];
  const agentLive = Boolean(spotlightId) || lastTool?.channel === "in-page-agent";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-paper px-4 py-3">
      <p className="type-eyebrow mr-auto">{companyName}</p>
      <HandDot label="You" tone="indigo" active />
      <HandDot
        label={
          agentWriting ? "Arena writing" : busy === "defending" ? "Arena" : "Arena"
        }
        tone="oxblood"
        active={agentWriting || busy === "defending"}
      />
      <HandDot label="Agent" tone="ochre" active={agentLive} />
    </div>
  );
}

function HandDot({
  label,
  tone,
  active,
}: {
  label: string;
  tone: "indigo" | "oxblood" | "ochre";
  active: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 type-eyebrow">
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
        <circle
          cx="8"
          cy="8"
          r="5"
          fill="none"
          stroke={`var(--${tone})`}
          strokeWidth={active ? "2.2" : "1.2"}
          style={{ filter: "url(#ink-rough)" }}
        />
      </svg>
      <span
        className={
          active
            ? tone === "indigo"
              ? "text-indigo"
              : tone === "oxblood"
                ? "text-oxblood"
                : "text-ochre"
            : "text-pencil"
        }
      >
        {label}
      </span>
    </span>
  );
}

function TensionScale({ arguments: args }: { arguments: Argument[] }) {
  const forWeight = args
    .filter((argument) => argument.stance === "for")
    .reduce((sum, argument) => sum + argument.strength, 0);
  const againstWeight = args
    .filter((argument) => argument.stance === "against")
    .reduce((sum, argument) => sum + argument.strength, 0);
  const total = forWeight + againstWeight;
  const forPct = total === 0 ? 50 : Math.round((forWeight / total) * 100);

  return (
    <div className="border-b border-rule bg-paper px-4 py-3">
      <BalanceSketch forPct={forPct} />
      <div className="flex items-baseline justify-between">
        <p className="type-eyebrow text-indigo">For {forPct}</p>
        <p className="type-eyebrow text-oxblood">Against {100 - forPct}</p>
      </div>
    </div>
  );
}

function EmptyTable({
  busy,
  onOpenRound,
}: {
  busy: "opening" | "defending" | "readiness" | null;
  onOpenRound: () => void;
}) {
  return (
    <div className="grid place-items-center px-6 py-14">
      <div className="max-w-[36ch] text-center">
        <p className="type-eyebrow">Empty table</p>
        <h2 className="type-display mt-3 text-[24px] font-semibold leading-snug">
          Let the five seats write.
        </h2>
        <Button
          className="mt-6 h-10 px-5"
          disabled={busy !== null}
          onClick={onOpenRound}
        >
          {busy === "opening" ? "Opening…" : "Let them write"}
        </Button>
      </div>
    </div>
  );
}

function TableObjects({
  contradictions,
  risks,
  evidence,
  actionItems,
  spotlightId,
}: {
  contradictions: Contradiction[];
  risks: Risk[];
  evidence: Evidence[];
  actionItems: ActionItem[];
  spotlightId: string | null;
}) {
  const resolveContradiction = useArena((state) => state.resolveContradiction);
  const updateRisk = useArena((state) => state.updateRisk);
  const updateEvidence = useArena((state) => state.updateEvidence);
  const toggleActionItem = useArena((state) => state.toggleActionItem);

  const openContradictions = contradictions.filter((item) => !item.resolved);
  const openRisks = risks.filter((item) => item.status === "open");
  const openEvidence = evidence.filter((item) => item.status === "requested");
  const openActions = actionItems.filter((item) => !item.done);
  const count =
    openContradictions.length +
    openRisks.length +
    openEvidence.length +
    openActions.length;

  if (count === 0) {
    return (
      <div className="border-t border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow text-pencil">Table is clear</p>
      </div>
    );
  }

  return (
    <div className="border-t border-rule bg-paper px-4 py-4">
      <p className="type-eyebrow">{count} still on the table</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {openContradictions.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                resolveContradiction(item.id, "Marked resolved by the founder.")
              }
              className={cn(
                "flex max-w-[22ch] items-start gap-2 bg-oxblood-wash px-2 py-2 text-left",
                spotlightId === item.id && "stamp-in",
              )}
            >
              <ObjectMark kind="contradiction" />
              <span className="text-[13px] leading-snug">{item.summary}</span>
            </button>
          </li>
        ))}
        {openRisks.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => updateRisk(item.id, { status: "mitigated" })}
              className={cn(
                "flex max-w-[22ch] items-start gap-2 bg-ochre-wash px-2 py-2 text-left",
                spotlightId === item.id && "stamp-in",
              )}
            >
              <ObjectMark kind="risk" />
              <span className="text-[13px] leading-snug">{item.title}</span>
            </button>
          </li>
        ))}
        {openEvidence.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => updateEvidence(item.id, { status: "provided" })}
              className="flex max-w-[22ch] items-start gap-2 bg-leaf px-2 py-2 text-left"
            >
              <ObjectMark kind="evidence" />
              <span className="text-[13px] leading-snug">{item.statement}</span>
            </button>
          </li>
        ))}
        {openActions.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggleActionItem(item.id)}
              className="flex max-w-[22ch] items-start gap-2 bg-leaf px-2 py-2 text-left"
            >
              <ObjectMark kind="action" />
              <span className="text-[13px] leading-snug">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoundComposer({
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
    <form
      className="border-t border-rule bg-indigo-wash px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Textarea
          name="defense"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Or write on the whole table. Click a card to answer one seat."
          rows={2}
          disabled={busy}
          className="min-h-[64px] flex-1 resize-none rounded-none border-0 bg-paper px-3 py-2 text-[16px] shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          disabled={busy || value.trim().length < 3}
          className="h-10 shrink-0 self-end px-5"
        >
          {busy ? "Reassessing…" : "Write"}
        </Button>
      </div>
    </form>
  );
}
