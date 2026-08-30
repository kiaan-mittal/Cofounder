"use client";

import Link from "next/link";

import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Contradiction, Evidence, Risk } from "@/lib/types";

const STEPS = [
  { id: "brain", label: "Brain", href: "/brain" },
  { id: "decision", label: "Decision" },
  { id: "arena", label: "Arena" },
  { id: "commit", label: "Commit" },
  { id: "predict", label: "Prediction" },
  { id: "outcome", label: "Outcome", href: "/history" },
  { id: "calibrate", label: "Calibration", href: "/calibration" },
] as const;

export function ArenaPath({
  here,
  framed = true,
}: {
  here: (typeof STEPS)[number]["id"];
  framed?: boolean;
}) {
  return (
    <ol
      className={cn(
        "flex overflow-x-auto",
        framed && "border border-rule",
      )}
    >
      {STEPS.map((step, index) => {
        const current = step.id === here;
        const label = (
          <span
            className={cn(
              "type-eyebrow block text-center",
              current ? "text-paper" : "text-graphite",
            )}
          >
            {step.label}
          </span>
        );
        return (
          <li
            key={step.id}
            className={cn(
              "flex min-w-[6.5rem] flex-1 items-center justify-center px-2 py-2.5",
              index > 0 && "border-l border-rule",
              current ? "bg-ink" : "bg-paper",
            )}
          >
            {"href" in step && step.href && !current ? (
              <Link href={step.href} className="hover:text-ink">
                {label}
              </Link>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function SharedState({
  risks,
  contradictions,
  evidence,
  stacked = false,
}: {
  risks: Risk[];
  contradictions: Contradiction[];
  evidence: Evidence[];
  stacked?: boolean;
}) {
  const updateRisk = useArena((state) => state.updateRisk);
  const resolveContradiction = useArena((state) => state.resolveContradiction);
  const updateEvidence = useArena((state) => state.updateEvidence);

  const openRisks = risks.filter((item) => item.status === "open");
  const openCons = contradictions.filter((item) => !item.resolved);
  const openEv = evidence.filter((item) => item.status === "requested");

  return (
    <section className="min-w-0 overflow-hidden border border-rule">
      <header className="border-b border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow">Shared arena state</p>
        <p className="mt-1 text-[13.5px] text-graphite">
          Founder and agent write the same three things. Nothing else.
        </p>
      </header>
      <div
        className={cn(
          "grid gap-px bg-rule",
          stacked ? "grid-cols-1" : "lg:grid-cols-3",
        )}
      >
        <Bucket
          label="Risks"
          empty="No open risk."
          items={openRisks.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.detail,
            meta: `${item.likelihood} · ${item.severity}/5`,
            onAct: () => updateRisk(item.id, { status: "accepted" }),
            act: "Accept",
          }))}
        />
        <Bucket
          label="Contradictions"
          empty="No open contradiction."
          items={openCons.map((item) => ({
            id: item.id,
            title: item.summary,
            body: `${item.sideA} — ${item.sideB}`,
            meta: "cannot both be true",
            onAct: () =>
              resolveContradiction(item.id, "Marked resolved by the founder."),
            act: "Resolve",
          }))}
        />
        <Bucket
          label="Evidence"
          empty="No outstanding evidence."
          items={openEv.map((item) => ({
            id: item.id,
            title: item.statement,
            body: null,
            meta: "requested",
            onAct: () => updateEvidence(item.id, { status: "provided" }),
            act: "Have it",
          }))}
        />
      </div>
    </section>
  );
}

function Bucket({
  label,
  empty,
  items,
}: {
  label: string;
  empty: string;
  items: Array<{
    id: string;
    title: string;
    body: string | null;
    meta: string;
    onAct: () => void;
    act: string;
  }>;
}) {
  return (
    <div className="min-w-0 bg-paper px-4 py-4">
      <p className="type-eyebrow">
        {label}
        {items.length ? ` · ${items.length}` : ""}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] text-graphite">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-[15px] leading-snug text-ink">{item.title}</p>
              {item.body ? (
                <p className="mt-1 text-[13.5px] leading-relaxed text-graphite">
                  {item.body}
                </p>
              ) : null}
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="type-eyebrow text-pencil">{item.meta}</span>
                <button
                  type="button"
                  onClick={item.onAct}
                  className="type-eyebrow text-ink underline underline-offset-4 hover:text-graphite"
                >
                  {item.act}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
