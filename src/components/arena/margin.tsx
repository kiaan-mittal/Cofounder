"use client";

import { InkRing } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type {
  ActionItem,
  Contradiction,
  Evidence,
  FounderPattern,
  Risk,
} from "@/lib/types";
import { founderCall } from "@/webmcp/run";

/**
 * The margin of the page: everything the debate has left unresolved.
 *
 * A contradiction blocks commitment, so it is drawn with the red pen ring —
 * the one piece of visual emphasis in the app that is reserved for a single
 * meaning.
 */

export function Margin({
  contradictions,
  risks,
  evidence,
  actionItems,
  patterns,
}: {
  contradictions: Contradiction[];
  risks: Risk[];
  evidence: Evidence[];
  actionItems: ActionItem[];
  patterns: FounderPattern[];
}) {
  const spotlightId = useArena((state) => state.spotlightId);

  const openContradictions = contradictions.filter((c) => !c.resolved);
  const openRisks = risks.filter((r) => r.status === "open");
  const openEvidence = evidence.filter((e) => e.status === "requested");

  return (
    <div className="space-y-10">
      {patterns.length ? (
        <section>
          <h2 className="type-eyebrow">Your record</h2>
          <ul className="mt-4 space-y-3">
            {patterns.slice(0, 3).map((pattern) => (
              <li
                key={pattern.id}
                className="border border-rule bg-oxblood-wash px-4 py-3"
              >
                <p className="text-[14px] leading-relaxed text-ink">
                  {pattern.insight}
                </p>
                <p className="type-eyebrow mt-1.5">
                  {pattern.sampleSize} outcomes · {pattern.confidence}% confidence
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="type-eyebrow">Contradictions</h2>
          <span className="type-figure text-[12px] text-pencil">
            {openContradictions.length}
          </span>
        </div>
        {openContradictions.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-pencil">
            None open. The Arena flags one only when two things you have said
            cannot both be true.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {openContradictions.map((contradiction) => (
              <li
                key={contradiction.id}
                className={cn(
                  "relative px-2 py-1",
                  spotlightId === contradiction.id && "stamp-in",
                )}
              >
                <InkRing className="-inset-x-1 -inset-y-1" />
                <p className="type-display relative text-[16px] leading-snug">
                  {contradiction.summary}
                </p>
                <div className="relative mt-3 space-y-2 text-[13.5px] leading-relaxed">
                  <p className="text-graphite">
                    <span className="type-eyebrow mr-2">you said</span>
                    {contradiction.sideA}
                  </p>
                  <p className="text-graphite">
                    <span className="type-eyebrow mr-2">but also</span>
                    {contradiction.sideB}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="type-eyebrow relative mt-2 -ml-3"
                  onClick={() =>
                    founderCall("resolve_contradiction", {
                      contradiction_id: contradiction.id,
                      resolution: "Marked resolved by the founder.",
                    })
                  }
                >
                  Mark resolved
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="type-eyebrow">Open risks</h2>
          <span className="type-figure text-[12px] text-pencil">
            {openRisks.length}
          </span>
        </div>
        {openRisks.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-pencil">
            No open risks.
          </p>
        ) : (
          <ul className="mt-4 space-y-5">
            {openRisks.map((risk) => (
              <li
                key={risk.id}
                className={cn(
                  "border border-rule bg-leaf px-4 py-3",
                  spotlightId === risk.id && "stamp-in bg-ochre-wash",
                )}
              >
                <p className="text-[14.5px] font-medium leading-snug text-ink">
                  {risk.title}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-graphite">
                  {risk.detail}
                </p>
                <p className="type-eyebrow mt-1.5">
                  severity {risk.severity}/5 · {risk.likelihood} likelihood
                  {risk.createdBy === "agent" ? " · added by agent" : ""}
                </p>
                <div className="-ml-3 mt-1 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="type-eyebrow"
                    onClick={() =>
                      founderCall("set_risk_status", {
                        risk_id: risk.id,
                        status: "mitigated",
                      })
                    }
                  >
                    Mitigated
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="type-eyebrow"
                    onClick={() =>
                      founderCall("set_risk_status", {
                        risk_id: risk.id,
                        status: "accepted",
                      })
                    }
                  >
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="type-eyebrow">Evidence requested</h2>
          <span className="type-figure text-[12px] text-pencil">
            {openEvidence.length}
          </span>
        </div>
        {openEvidence.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-pencil">
            Nothing outstanding.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {openEvidence.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "border border-rule bg-leaf px-4 py-3",
                  spotlightId === item.id && "stamp-in bg-leaf",
                )}
              >
                <p className="text-[14px] leading-relaxed text-ink">
                  {item.statement}
                </p>
                <div className="-ml-3 mt-1 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="type-eyebrow"
                    onClick={() =>
                      founderCall("mark_evidence", {
                        evidence_id: item.id,
                        status: "provided",
                      })
                    }
                  >
                    I checked this
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="type-eyebrow"
                    onClick={() =>
                      founderCall("mark_evidence", {
                        evidence_id: item.id,
                        status: "unavailable",
                      })
                    }
                  >
                    Can&rsquo;t know
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actionItems.length ? (
        <section>
          <h2 className="type-eyebrow">Next steps</h2>
          <ul className="mt-4 space-y-2.5">
            {actionItems.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    founderCall("toggle_action_item", {
                      action_item_id: item.id,
                    })
                  }
                  className="mt-1 size-3.5 accent-[var(--ink)]"
                />
                <label
                  htmlFor={item.id}
                  className={cn(
                    "text-[14px] leading-relaxed",
                    item.done ? "text-pencil line-through" : "text-ink",
                  )}
                >
                  {item.text}
                  <span className="type-eyebrow ml-2">{item.owner}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
