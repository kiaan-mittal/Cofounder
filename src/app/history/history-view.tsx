"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { detectPatterns } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Decision, Outcome, Prediction } from "@/lib/types";

export function HistoryView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {() => <History />}
    </RequireCompany>
  );
}

function History() {
  const decisions = useArena((state) => state.decisions);
  const setActiveDecision = useArena((state) => state.setActiveDecision);

  if (decisions.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <div className="max-w-[46ch]">
          <p className="type-eyebrow">Decision history</p>
          <h1 className="type-display mt-5 text-[clamp(2rem,4vw,2.75rem)] font-semibold">
            Nothing on the record yet.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-graphite">
            Every decision you take through the Arena is kept here with what you
            chose, what you predicted, and what actually happened. That record is
            what makes the next debate specific rather than generic.
          </p>
          <Button asChild size="lg" className="mt-8 h-11 px-6 text-[15px]">
            <Link href="/arena">Open a decision</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <header className="max-w-[52ch]">
        <p className="type-eyebrow">Decision history</p>
        <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3rem)] font-semibold">
          What you decided, and what reality said.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-graphite">
          Record the real numbers when a deadline lands. Every outcome you enter
          sharpens the challenges in your next decision.
        </p>
      </header>

      <InkRule className="my-12" />

      <ul className="space-y-16">
        {decisions.map((decision) => (
          <li key={decision.id}>
            <DecisionRecord
              decision={decision}
              onReopen={() => setActiveDecision(decision.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DecisionRecord({
  decision,
  onReopen,
}: {
  decision: Decision;
  onReopen: () => void;
}) {
  const predictions = useArena(
    useShallow((state) =>
      state.predictions.filter((p) => p.decisionId === decision.id),
    ),
  );
  const outcome = useArena((state) =>
    state.outcomes.find((o) => o.decisionId === decision.id),
  );
  const chosen = decision.options.find((o) => o.id === decision.chosenOptionId);

  return (
    <article className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
      <div>
        <p className="type-eyebrow">
          {new Date(decision.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}{" "}
          · {decision.status}
        </p>
        <h2 className="type-display mt-3 text-[26px] font-semibold leading-tight">
          {decision.question}
        </h2>

        {chosen ? (
          <p className="mt-4 text-[15px] leading-relaxed text-ink">
            <span className="type-eyebrow mr-2">chose</span>
            {chosen.label}
          </p>
        ) : null}

        {decision.commitmentRationale ? (
          <p className="mt-3 border border-rule bg-leaf px-4 py-3 text-[15px] leading-relaxed text-graphite">
            {decision.commitmentRationale}
          </p>
        ) : null}

        <p className="type-eyebrow mt-4">
          your confidence {decision.founderConfidence} · arena{" "}
          {decision.agentConfidence}
        </p>

        {outcome ? (
          <div className="mt-6 border border-rule bg-moss-wash px-4 py-4">
            <p className="type-eyebrow text-moss">outcome · {outcome.result}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {outcome.summary}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              <span className="type-eyebrow mr-2">lesson</span>
              {outcome.lesson}
            </p>
          </div>
        ) : (
          <OutcomeForm decision={decision} />
        )}

        {decision.status !== "committed" ? (
          <Button
            asChild
            variant="ghost"
            className="type-eyebrow mt-4 -ml-3"
            onClick={onReopen}
          >
            <Link href="/arena">Reopen in the Arena</Link>
          </Button>
        ) : null}
      </div>

      <div>
        <p className="type-eyebrow">Predictions</p>
        {predictions.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-pencil">
            No measurable prediction was attached to this decision.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {predictions.map((prediction) => (
              <PredictionRow key={prediction.id} prediction={prediction} />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

const RESULT_TONE: Record<Prediction["status"], string> = {
  pending: "text-graphite",
  hit: "text-moss",
  partial: "text-ochre",
  missed: "text-oxblood",
};

const RESULT_LABEL: Record<Prediction["status"], string> = {
  pending: "waiting on reality",
  hit: "hit",
  partial: "close",
  missed: "missed",
};

function PredictionRow({ prediction }: { prediction: Prediction }) {
  const recordActual = useArena((state) => state.recordActual);
  const [actual, setActual] = useState("");

  const overdue =
    prediction.status === "pending" &&
    new Date(prediction.deadline).getTime() < Date.now();

  function record() {
    const value = Number(actual);
    if (!Number.isFinite(value)) return;

    const updated = recordActual(prediction.id, value);
    const state = useArena.getState();
    if (state.company) {
      state.setPatterns(
        detectPatterns(state.company.id, state.predictions, state.decisions),
      );
    }
    if (updated) {
      toast(
        updated.status === "hit"
          ? "Called it"
          : updated.status === "partial"
            ? "Close"
            : "Missed",
        {
          description: `Expected ${updated.expectedValue} ${updated.unit}, actual ${value}. Calibration updated.`,
        },
      );
    }
  }

  return (
    <li className="border border-rule bg-leaf px-4 py-3">
      <p className="text-[14.5px] leading-relaxed text-ink">
        {prediction.statement}
      </p>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="type-figure text-[13px]">
          <span className="type-eyebrow mr-1.5">expected</span>
          {prediction.expectedValue} {prediction.unit}
        </span>
        {prediction.actualValue !== undefined ? (
          <span className="type-figure text-[13px]">
            <span className="type-eyebrow mr-1.5">actual</span>
            {prediction.actualValue} {prediction.unit}
          </span>
        ) : null}
        <span className={cn("type-eyebrow", RESULT_TONE[prediction.status])}>
          {RESULT_LABEL[prediction.status]}
          {prediction.ratio && prediction.status !== "hit"
            ? ` · ${prediction.ratio.toFixed(1)}× off`
            : ""}
        </span>
      </div>

      <p className="type-eyebrow mt-1.5">
        {prediction.domain} · due{" "}
        {new Date(prediction.deadline).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        {overdue ? " · overdue" : ""}
      </p>

      {prediction.status === "pending" ? (
        <div className="mt-4 flex items-end gap-2">
          <Field id={`${prediction.id}-actual`} label="Actual" className="w-44">
            <Input
              id={`${prediction.id}-actual`}
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              inputMode="numeric"
              placeholder={prediction.unit}
              className="type-figure"
            />
          </Field>
          <Button
            size="sm"
            variant="outline"
            onClick={record}
            disabled={!actual.trim()}
            className="mb-px h-12"
          >
            Record
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function OutcomeForm({ decision }: { decision: Decision }) {
  const addOutcome = useArena((state) => state.addOutcome);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Outcome["result"]>("mixed");
  const [summary, setSummary] = useState("");
  const [lesson, setLesson] = useState("");

  if (!open) {
    return (
      <Button
        variant="outline"
        className="mt-6 h-10"
        onClick={() => setOpen(true)}
      >
        Record what happened
      </Button>
    );
  }

  function save() {
    addOutcome({
      id: id("out"),
      decisionId: decision.id,
      result,
      summary: summary.trim(),
      lesson: lesson.trim(),
      recordedAt: now(),
    });

    const state = useArena.getState();
    if (state.company) {
      state.setPatterns(
        detectPatterns(state.company.id, state.predictions, state.decisions),
      );
    }

    toast("Outcome recorded", {
      description: "The lesson will be quoted back in your next decision.",
    });
    setOpen(false);
  }

  return (
    <div className="mt-6 space-y-5 border border-rule bg-leaf p-5">
      <div>
        <p className="type-eyebrow">How did it go?</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["succeeded", "mixed", "failed", "too_early"] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => setResult(value)}
                className={cn(
                  "type-eyebrow border px-3 py-1.5 transition-colors",
                  result === value
                    ? "border-ink bg-ink text-paper"
                    : "border-rule hover:border-rule-strong",
                )}
              >
                {value === "too_early" ? "too early" : value}
              </button>
            ),
          )}
        </div>
      </div>

      <Field id={`summary-${decision.id}`} label="What actually happened">
        <Textarea
          id={`summary-${decision.id}`}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={2}
        />
      </Field>

      <Field
        id={`lesson-${decision.id}`}
        label="The transferable lesson"
        hint="What would have to be true next time — not 'we should have moved faster'."
      >
        <Textarea
          id={`lesson-${decision.id}`}
          value={lesson}
          onChange={(event) => setLesson(event.target.value)}
          rows={2}
          placeholder="Shipping faster did not make anyone hear about it."
        />
      </Field>

      <div className="flex gap-2">
        <Button onClick={save} disabled={!summary.trim() || !lesson.trim()}>
          Save outcome
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
