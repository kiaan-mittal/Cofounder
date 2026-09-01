"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { ExportDecision } from "@/components/arena/export-decision";
import { ArenaPath } from "@/components/arena/the-loop";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { argumentsFor } from "@/lib/selectors";
import { perspectiveName } from "@/lib/perspectives";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Argument, Decision, Outcome, Prediction } from "@/lib/types";
import { founderCall, runTool } from "@/webmcp/run";

export function HistoryView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {() => <History initialSnapshot={initialSnapshot} />}
    </RequireCompany>
  );
}

function History({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const storeDecisions = useArena((state) => state.decisions);
  const seeded =
    Array.isArray(initialSnapshot?.decisions)
      ? (initialSnapshot.decisions as Decision[])
      : [];
  const decisions = storeDecisions.length ? storeDecisions : seeded;

  if (decisions.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <ArenaPath here="outcome" />
        <div className="mt-8 max-w-[46ch]">
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
      <ArenaPath here="outcome" />
      <header className="mt-8 max-w-[52ch]">
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

      <ul className="space-y-12">
        {decisions.map((decision) => (
          <li key={decision.id} className="border border-rule bg-paper">
            <DecisionRecord
              decision={decision}
              fallbackArgs={
                Array.isArray(initialSnapshot?.argumentList)
                  ? (initialSnapshot.argumentList as Argument[])
                  : []
              }
              fallbackPredictions={
                Array.isArray(initialSnapshot?.predictions)
                  ? (initialSnapshot.predictions as Prediction[])
                  : []
              }
              onReopen={() =>
                founderCall("open_saved_decision", { decision_id: decision.id })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DecisionRecord({
  decision,
  fallbackArgs,
  fallbackPredictions,
  onReopen,
}: {
  decision: Decision;
  fallbackArgs: Argument[];
  fallbackPredictions: Prediction[];
  onReopen: () => void;
}) {
  const storePredictions = useArena(
    useShallow((state) =>
      state.predictions.filter((p) => p.decisionId === decision.id),
    ),
  );
  const predictions = storePredictions.length
    ? storePredictions
    : fallbackPredictions.filter((item) => item.decisionId === decision.id);
  const outcome = useArena((state) =>
    state.outcomes.find((o) => o.decisionId === decision.id),
  );
  const chosen = decision.options.find((o) => o.id === decision.chosenOptionId);

  return (
    <article className="p-5 sm:p-7">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:gap-12">
        <div>
          <p className="type-eyebrow">
            {new Date(decision.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            · {decision.status}
          </p>
          <h2 className="type-display mt-3 text-[24px] font-semibold leading-tight">
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

          <SeatVoices decisionId={decision.id} fallbackArgs={fallbackArgs} />

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
          ) : decision.status === "committed" ? (
            <OutcomeForm decision={decision} />
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="h-10" onClick={onReopen}>
              <Link href="/arena">
                {decision.status === "committed"
                  ? "Review in the Arena"
                  : "Open in the Arena"}
              </Link>
            </Button>
            <ExportDecision
              decisionId={decision.id}
              returnTo="/history"
              compact
            />
          </div>
        </div>

        <div className="border-t border-rule pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="type-eyebrow">Predictions</p>
          {predictions.length === 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-graphite">
              No number was attached. Commit from the Arena and say what would
              prove you right.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {predictions.map((prediction) => (
                <PredictionRow key={prediction.id} prediction={prediction} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function SeatVoices({
  decisionId,
  fallbackArgs,
}: {
  decisionId: string;
  fallbackArgs: Argument[];
}) {
  const storeArgs = useArena(
    useShallow((state) =>
      argumentsFor(state, decisionId).filter((item) => !item.challengesId),
    ),
  );
  const args = storeArgs.length
    ? storeArgs
    : fallbackArgs.filter(
        (item) => item.decisionId === decisionId && !item.challengesId,
      );

  if (args.length === 0) {
    return (
      <p className="mt-5 text-[14px] leading-relaxed text-graphite">
        The five seats have not written on this decision yet.
      </p>
    );
  }

  return (
    <ul className="mt-5 grid gap-px bg-rule sm:grid-cols-2">
      {args.map((argument) => (
        <SeatVoice key={argument.id} argument={argument} />
      ))}
    </ul>
  );
}

function SeatVoice({ argument }: { argument: Argument }) {
  return (
    <li className="bg-leaf px-3.5 py-3">
      <div className="flex items-start gap-2">
        <PerspectiveEmblem
          perspective={argument.perspective}
          className="size-8 shrink-0"
        />
        <div className="min-w-0">
          <p className="type-eyebrow">
            {perspectiveName(argument.perspective)} · {argument.stance}
          </p>
          <p className="mt-1 text-[14.5px] leading-snug text-ink">
            {argument.claim}
          </p>
          {argument.reasoning ? (
            <p className="mt-2 text-[13.5px] leading-relaxed text-graphite">
              {argument.reasoning}
            </p>
          ) : null}
        </div>
      </div>
    </li>
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
  const [actual, setActual] = useState("");

  const overdue =
    prediction.status === "pending" &&
    new Date(prediction.deadline).getTime() < Date.now();

  function record() {
    const value = Number(actual);
    if (!Number.isFinite(value)) return;

    void runTool(
      "evaluate_prediction",
      { prediction_id: prediction.id, actual_value: value },
      { channel: "founder" },
    ).then((result) => {
      if (!result.ok) return;
      const status =
        typeof result.data?.status === "string" ? result.data.status : "";
      toast(
        status === "hit" ? "Called it" : status === "partial" ? "Close" : "Missed",
        {
          description: `Expected ${prediction.expectedValue} ${prediction.unit}, actual ${value}. Calibration updated.`,
        },
      );
    });
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
    void runTool(
      "record_outcome",
      {
        decision_id: decision.id,
        result,
        summary: summary.trim(),
        lesson: lesson.trim(),
      },
      { channel: "founder" },
    ).then((outcome) => {
      if (!outcome.ok) return;
      toast("Outcome recorded", {
        description: "The lesson will be quoted back in your next decision.",
      });
      setOpen(false);
    });
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
