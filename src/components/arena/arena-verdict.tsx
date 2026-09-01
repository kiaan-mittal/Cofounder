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
 *
 * Lives as a one-line dock so the board keeps the page. The full call
 * opens over the floor, it does not take another permanent strip.
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
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const headline = call
    ? call.deadlock
      ? "The seats will not give you a clean call."
      : call.leaningLabel
    : committed
      ? "This round is on the record."
      : "Weigh the seats when you have read them.";

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
          className="absolute bottom-full left-0 right-0 max-h-[min(48vh,26rem)] overflow-y-auto border-t border-rule bg-leaf px-4 py-4 shadow-[0_-12px_32px_rgba(28,24,20,0.08)]"
        >
          {call.deadlock ? (
            <p className="type-eyebrow text-oxblood">Arena deadlock</p>
          ) : (
            <p className="type-eyebrow">Weigh it up</p>
          )}
          <p className="type-display mt-1.5 text-[20px] font-semibold leading-tight">
            {headline}
            <span className="ml-2 type-figure text-[13px] font-normal text-graphite">
              {call.arenaConfidence}% arena
            </span>
          </p>
          {call.deadlock && call.deadlockNote ? (
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink">
              {call.deadlockNote}
            </p>
          ) : null}

          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="type-eyebrow text-moss">Strongest for</dt>
              <dd className="mt-1 text-[14px] leading-snug text-ink">
                {call.strongestFor
                  ? `${call.strongestFor.seat} — ${call.strongestFor.claim}`
                  : "No seat argued to act."}
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow text-oxblood">Strongest against</dt>
              <dd className="mt-1 text-[14px] leading-snug text-ink">
                {call.strongestAgainst
                  ? `${call.strongestAgainst.seat} — ${call.strongestAgainst.claim}`
                  : "No seat argued to wait."}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[13.5px] leading-relaxed text-graphite">
            What would change it: {call.whatWouldChangeIt}
            {call.contradictionsOpen
              ? ` · ${call.contradictionsOpen} contradiction${call.contradictionsOpen === 1 ? "" : "s"} open`
              : ""}
            {call.evidenceOutstanding.length
              ? ` · ${call.evidenceOutstanding.length} evidence still out`
              : ""}
          </p>

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
                <span className="text-oxblood">The Arena&rsquo;s confidence</span>
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
              {call?.deadlock ? "Deadlock" : "Weigh it up"}
              {call
                ? ` · ${call.arenaConfidence}% · you ${current.founderConfidence}`
                : ` · you ${current.founderConfidence} · arena ${current.agentConfidence}`}
            </span>
            {headline}
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
              {open ? "Hide" : "Details"}
            </Button>
          ) : null}

          {committed ? (
            <Button asChild variant="outline" className="h-8 px-3 text-[13px]">
              <Link href="/history">Open the record</Link>
            </Button>
          ) : call ? (
            <>
              <Button
                type="button"
                className="h-8 px-3 text-[13px]"
                onClick={onCommit}
              >
                Weigh it up
              </Button>
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
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-[13px]"
                onClick={() =>
                  founderCall("set_decision_status", {
                    status: "abandoned",
                    decision_id: decisionId,
                  })
                }
              >
                Reject
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="h-8 px-3 text-[13px]"
              disabled={weighDisabled}
              onClick={onCommit}
            >
              Weigh it up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { ArenaCallDock as ArenaVerdict };

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
