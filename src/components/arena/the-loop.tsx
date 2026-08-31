"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { StillOpenItem } from "@/lib/selectors";
import type { Contradiction, Evidence, Risk } from "@/lib/types";
import { founderCall } from "@/webmcp/run";

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
              current ? "text-paper" : "text-ink",
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
              current ? "bg-ink text-paper" : "bg-paper text-ink",
            )}
          >
            {"href" in step && step.href && !current ? (
              <Link href={step.href} className="text-ink hover:text-ink">
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
  stillOpen = [],
  stacked = false,
}: {
  risks: Risk[];
  contradictions: Contradiction[];
  evidence: Evidence[];
  stillOpen?: StillOpenItem[];
  stacked?: boolean;
}) {
  const openRisks = risks.filter((item) => item.status === "open");
  const openCons = contradictions.filter((item) => !item.resolved);
  const openEv = evidence.filter((item) => item.status === "requested");

  return (
    <section className="min-w-0 overflow-hidden border border-rule">
      <header className="border-b border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow">Shared arena state</p>
        <p className="mt-1 text-[13.5px] text-graphite">
          Risks, contradictions, evidence, and what the seats have not been
          paid.
        </p>
      </header>
      <div
        className={cn(
          "grid gap-px bg-rule",
          stacked ? "grid-cols-1" : "lg:grid-cols-2 xl:grid-cols-4",
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
            onAct: () =>
              founderCall("set_risk_status", {
                risk_id: item.id,
                status: "accepted",
              }),
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
              founderCall("resolve_contradiction", {
                contradiction_id: item.id,
                resolution: "Marked resolved by the founder.",
              }),
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
            onAct: () =>
              founderCall("mark_evidence", {
                evidence_id: item.id,
                status: "provided",
              }),
            act: "Have it",
          }))}
        />
        <Bucket
          label="Still open"
          empty="Nothing still open."
          tone="open"
          items={stillOpen.map((item) => ({
            id: item.id,
            title: item.text,
            body: null,
            meta: item.seat,
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
  tone,
}: {
  label: string;
  empty: string;
  tone?: "open";
  items: Array<{
    id: string;
    title: string;
    body: string | null;
    meta: string;
    onAct?: () => void;
    act?: string;
  }>;
}) {
  return (
    <div className="min-w-0 bg-paper px-4 py-4">
      <p className={cn("type-eyebrow", tone === "open" && "text-oxblood")}>
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
                <span
                  className={cn(
                    "type-eyebrow",
                    tone === "open" ? "text-oxblood" : "text-pencil",
                  )}
                >
                  {item.meta}
                </span>
                {item.onAct && item.act ? (
                  <button
                    type="button"
                    onClick={item.onAct}
                    className="type-eyebrow text-ink underline underline-offset-4 hover:text-graphite"
                  >
                    {item.act}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
