"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { HatchMeter } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { arenaVerdict } from "@/lib/arena-verdict";
import { useArena, type ArenaState } from "@/lib/store";
import type {
  Argument,
  Contradiction,
  Decision,
  Evidence,
  Reassessment,
  Risk,
} from "@/lib/types";
import { founderCall, runTool } from "@/webmcp/run";

/**
 * The matrix after seats have written. Deadlock is a first-class result.
 * Accept / hold / reject stay with the founder — agents cannot press these.
 */

export function ArenaCallDock({
  decision,
  committed,
  weighDisabled,
  onCommit,
  arguments: args = [],
  risks = [],
  evidence = [],
  contradictions = [],
  reassessments = [],
}: {
  decision: Decision;
  committed: boolean;
  weighDisabled: boolean;
  onCommit: () => void;
  arguments?: Argument[];
  risks?: Risk[];
  evidence?: Evidence[];
  contradictions?: Contradiction[];
  reassessments?: Reassessment[];
}) {
  const decisionId = decision.id;
  const seats = args.filter((item) => !item.challengesId).length;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const live = useArena((state) =>
    state.decisions.find((item) => item.id === decisionId),
  );
  const current = live ?? decision;
  const updateDecision = useArena((state) => state.updateDecision);
  const snapshot = useArena(
    (state) =>
      `${state.decisions.length}:${state.argumentList.length}:${state.contradictions.length}:${state.evidence.length}:${state.risks.length}:${state.activeDecisionId}`,
  );
  const verdict = useMemo(() => {
    const state = useArena.getState();
    return arenaVerdict(
      withVisibleRecord(state, decision, {
        args,
        risks,
        evidence,
        contradictions,
        reassessments,
      }),
      decisionId,
    );
  }, [
    decision,
    decisionId,
    args,
    risks,
    evidence,
    contradictions,
    reassessments,
    snapshot,
  ]);
  const call = verdict && verdict.leaning !== "too-early" ? verdict : null;

  useEffect(() => {
    setOpen(false);
  }, [decisionId]);

  useEffect(() => {
    if (seats >= 5) setOpen(true);
  }, [seats]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function setFounderConfidence(value: number) {
    updateDecision(decisionId, { founderConfidence: value });
  }

  function commitFounderConfidence() {
    const value = useArena
      .getState()
      .decisions.find((item) => item.id === decisionId)?.founderConfidence;
    if (typeof value !== "number") return;
    void runTool(
      "set_confidence",
      { founder: value, decision_id: decisionId },
      { channel: "founder" },
    );
  }

  return (
    <div className="relative z-20 shrink-0">
      {open && call ? (
        <section
          id={panelId}
          className="absolute bottom-full left-0 right-0 max-h-[min(62vh,34rem)] overflow-y-auto border-t border-rule bg-leaf px-4 py-4 shadow-[0_-12px_32px_rgba(28,24,20,0.08)]"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="type-eyebrow">
                {call.deadlock ? "Deadlock" : "Verdict"}
              </p>
              <p className="type-display mt-1 text-[22px] font-semibold leading-tight">
                {call.verdictLabel}
              </p>
            </div>
            <p className="type-figure text-[28px] leading-none text-ink">
              {call.arenaConfidence}
              <span className="ml-1 type-eyebrow text-graphite">%</span>
            </p>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p className="type-eyebrow text-indigo">For {call.forPct}</p>
            <p className="type-eyebrow text-oxblood">Against {call.againstPct}</p>
          </div>
          <div className="mt-1.5 flex h-2 overflow-hidden border border-rule bg-paper">
            <span
              className="h-full bg-indigo"
              style={{ width: `${call.forPct}%` }}
            />
            <span
              className="h-full bg-oxblood"
              style={{ width: `${call.againstPct}%` }}
            />
          </div>

          <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-ink">
            {call.why}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            <Score label="Evidence" value={call.scores.evidence} />
            <Score label="Confidence" value={call.scores.confidence} />
            <Score label="Risk" value={call.scores.risk} tone="oxblood" />
            <Score label="Undo" value={call.scores.reversibility} />
            <Score label="Upside" value={call.scores.upside} />
          </dl>

          {call.flipConditions.length ? (
            <div className="mt-5">
              <p className="type-eyebrow">Would flip if</p>
              <ul className="mt-2 space-y-1.5">
                {call.flipConditions.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-[13.5px] leading-snug text-ink"
                  >
                    <span className="type-figure text-moss">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {call.nextMove ? (
            <div className="mt-5 border-t border-rule pt-4">
              <p className="type-eyebrow">Next move</p>
              <p className="type-display mt-1 text-[18px] font-semibold leading-snug">
                {call.nextMove}
              </p>
              {call.nextMoveSteps.length ? (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] leading-snug text-ink">
                  {call.nextMoveSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="founder-confidence"
                className="type-eyebrow flex items-baseline justify-between"
              >
                <span className="text-indigo">Your confidence</span>
                <span className="type-figure text-ink">
                  {current.founderConfidence}
                </span>
              </label>
              <input
                id="founder-confidence"
                type="range"
                min={0}
                max={100}
                value={current.founderConfidence}
                disabled={committed}
                onChange={(event) =>
                  setFounderConfidence(Number(event.target.value))
                }
                onPointerUp={commitFounderConfidence}
                className="mt-2 w-full accent-[var(--indigo)]"
              />
            </div>
            <div>
              <p className="type-eyebrow flex items-baseline justify-between">
                <span className="text-oxblood">Floor confidence</span>
                <span className="type-figure text-ink">
                  {current.agentConfidence}
                </span>
              </p>
              <HatchMeter
                value={current.agentConfidence}
                tone="oxblood"
                className="mt-2"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rule bg-paper px-4 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] leading-snug text-ink">
            <span className="type-eyebrow mr-2 text-graphite">
              Weigh it up
              {call
                ? ` · ${call.arenaConfidence}% · for ${call.forPct} / against ${call.againstPct}`
                : ` · you ${current.founderConfidence} · arena ${current.agentConfidence}`}
            </span>
            {call?.verdictLabel ??
              (committed
                ? "This round is on the record."
                : "Weigh the seats when you have read them.")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {call ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-[13px]"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? "Hide" : "Verdict"}
            </Button>
          ) : null}

          {committed ? (
            <Button asChild variant="outline" className="h-8 px-3 text-[13px]">
              <Link href="/history">Open the record</Link>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                className="h-8 px-3 text-[13px]"
                disabled={weighDisabled}
                onClick={onCommit}
              >
                {call ? "Commit decision" : "Weigh it up"}
              </Button>
              {call ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-[13px]"
                  onClick={() =>
                    founderCall("set_decision_status", {
                      status: "investigating",
                      decision_id: decisionId,
                    })
                  }
                >
                  Hold
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { ArenaCallDock as ArenaVerdict };

function Score({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "oxblood";
}) {
  return (
    <div>
      <dt className="type-eyebrow flex items-baseline justify-between">
        <span>{label}</span>
        <span className="type-figure text-ink">{value}</span>
      </dt>
      <dd>
        <HatchMeter
          value={value}
          tone={tone}
          strokes={10}
          className="mt-1"
        />
      </dd>
    </div>
  );
}

function withVisibleRecord(
  state: ArenaState,
  decision: Decision,
  pieces: {
    args: Argument[];
    risks: Risk[];
    evidence: Evidence[];
    contradictions: Contradiction[];
    reassessments: Reassessment[];
  },
): ArenaState {
  const id = decision.id;
  function take<T extends { decisionId: string }>(local: T[], incoming: T[]) {
    return local.some((item) => item.decisionId === id)
      ? local
      : [...local, ...incoming];
  }
  return {
    ...state,
    decisions: state.decisions.some((item) => item.id === id)
      ? state.decisions
      : [decision, ...state.decisions],
    argumentList: take(state.argumentList, pieces.args),
    risks: take(state.risks, pieces.risks),
    evidence: take(state.evidence, pieces.evidence),
    contradictions: take(state.contradictions, pieces.contradictions),
    reassessments: take(state.reassessments, pieces.reassessments),
  };
}
