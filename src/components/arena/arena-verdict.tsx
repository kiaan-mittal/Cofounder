"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { arenaVerdict } from "@/lib/arena-verdict";
import { useArena } from "@/lib/store";
import { founderCall } from "@/webmcp/run";

/**
 * The matrix after seats have written. Deadlock is a first-class result.
 * Accept / hold / reject stay with the founder — agents cannot press these.
 */

export function ArenaVerdict({
  decisionId,
  onAccept,
}: {
  decisionId: string;
  onAccept: () => void;
}) {
  const snapshot = useArena(
    (state) =>
      `${state.argumentList.length}:${state.contradictions.length}:${state.evidence.length}:${state.risks.length}:${state.activeDecisionId}`,
  );
  const verdict = useMemo(
    () => arenaVerdict(useArena.getState(), decisionId),
    [decisionId, snapshot],
  );

  if (!verdict || verdict.leaning === "too-early") return null;

  return (
    <section className="shrink-0 border-t border-rule bg-leaf px-4 py-3">
      {verdict.deadlock ? (
        <p className="type-eyebrow text-oxblood">Arena deadlock</p>
      ) : (
        <p className="type-eyebrow">Decision on the table</p>
      )}
      <p className="type-display mt-1.5 text-[20px] font-semibold leading-tight">
        {verdict.deadlock
          ? "The seats will not give you a clean call."
          : verdict.leaningLabel}
        <span className="ml-2 type-figure text-[13px] font-normal text-graphite">
          {verdict.arenaConfidence}% arena
        </span>
      </p>
      {verdict.deadlock && verdict.deadlockNote ? (
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink">
          {verdict.deadlockNote}
        </p>
      ) : null}

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="type-eyebrow text-moss">Strongest for</dt>
          <dd className="mt-1 text-[14px] leading-snug text-ink">
            {verdict.strongestFor
              ? `${verdict.strongestFor.seat} — ${verdict.strongestFor.claim}`
              : "No seat argued to act."}
          </dd>
        </div>
        <div>
          <dt className="type-eyebrow text-oxblood">Strongest against</dt>
          <dd className="mt-1 text-[14px] leading-snug text-ink">
            {verdict.strongestAgainst
              ? `${verdict.strongestAgainst.seat} — ${verdict.strongestAgainst.claim}`
              : "No seat argued to wait."}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[13.5px] leading-relaxed text-graphite">
        What would change it: {verdict.whatWouldChangeIt}
        {verdict.contradictionsOpen
          ? ` · ${verdict.contradictionsOpen} contradiction${verdict.contradictionsOpen === 1 ? "" : "s"} open`
          : ""}
        {verdict.evidenceOutstanding.length
          ? ` · ${verdict.evidenceOutstanding.length} evidence still out`
          : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" className="h-8 px-3 text-[13px]" onClick={onAccept}>
          Accept — I will commit
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
      </div>
    </section>
  );
}
