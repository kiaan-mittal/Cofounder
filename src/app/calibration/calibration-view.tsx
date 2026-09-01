"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { ArenaPath } from "@/components/arena/the-loop";
import { HatchMeter, InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import {
  DOMAIN_LABEL,
  accuracyOf,
  calibrationBands,
  detectPatterns,
} from "@/lib/calibration";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Outcome, Prediction } from "@/lib/types";

export function CalibrationView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {() => <Calibration initialSnapshot={initialSnapshot} />}
    </RequireCompany>
  );
}

function Calibration({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const company = useArena((state) => state.company);
  const storePredictions = useArena((state) => state.predictions);
  const storeDecisions = useArena((state) => state.decisions);
  const storeOutcomes = useArena((state) => state.outcomes);
  const predictions = storePredictions.length
    ? storePredictions
    : Array.isArray(initialSnapshot?.predictions)
      ? (initialSnapshot.predictions as typeof storePredictions)
      : [];
  const decisions = storeDecisions.length
    ? storeDecisions
    : Array.isArray(initialSnapshot?.decisions)
      ? (initialSnapshot.decisions as typeof storeDecisions)
      : [];
  const outcomes = storeOutcomes.length
    ? storeOutcomes
    : Array.isArray(initialSnapshot?.outcomes)
      ? (initialSnapshot.outcomes as Outcome[])
      : [];
  const patterns = useArena((state) => state.patterns);
  const setPatterns = useArena((state) => state.setPatterns);

  useEffect(() => {
    if (!company) return;
    setPatterns(detectPatterns(company.id, predictions, decisions));
  }, [company, decisions, predictions, setPatterns]);

  const bands = calibrationBands(predictions);
  const evaluated = predictions.filter((p) => p.status !== "pending");
  const pending = predictions.filter((p) => p.status === "pending");
  const mean = useMemo(() => {
    if (!evaluated.length) return null;
    return Math.round(
      evaluated.reduce((sum, item) => sum + accuracyOf(item), 0) /
        evaluated.length,
    );
  }, [evaluated]);
  const over = evaluated.filter((item) => (item.ratio ?? 1) > 1.15).length;
  const under = evaluated.filter((item) => (item.ratio ?? 1) < 0.85).length;
  const hits = evaluated.filter((item) => item.status === "hit").length;
  const outcomeByDecision = new Map(
    outcomes.map((item) => [item.decisionId, item]),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <ArenaPath here="calibrate" />
      <header className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.7fr)] lg:items-end">
        <div className="max-w-[54ch]">
          <p className="type-eyebrow">Founder calibration</p>
          <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.05]">
            The book of being wrong, on purpose.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-graphite">
            {evaluated.length === 0
              ? pending.length
                ? `${pending.length} number${pending.length === 1 ? " is" : "s are"} waiting on reality. Write the actual on History when the date lands.`
                : "No predictions have met reality yet. Commit, attach a number, come back."
              : `Every row is a number you wrote before the fact. ${evaluated.length} have met reality. Nothing here is a vibe.`}
          </p>
        </div>
        {mean !== null ? (
          <aside className="border border-ink bg-leaf px-5 py-5">
            <p className="type-eyebrow">Across the ledger</p>
            <p className="type-display mt-2 text-[56px] font-semibold leading-none tabular-nums">
              {mean}
              <span className="ml-1 text-[18px] text-graphite">%</span>
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-graphite">
              {hits} hit · {over} overshot · {under} undershot · {pending.length}{" "}
              still open
            </p>
          </aside>
        ) : null}
      </header>

      {evaluated.length ? (
        <>
          <InkRule className="my-12" />
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="type-eyebrow">Expected versus actual</h2>
              <p className="text-[13px] text-graphite">
                Left is what you said. Right is what happened.
              </p>
            </div>
            <ol className="mt-6 divide-y divide-rule border border-rule">
              {evaluated
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.evaluatedAt ?? b.deadline).getTime() -
                    new Date(a.evaluatedAt ?? a.deadline).getTime(),
                )
                .map((prediction, index) => (
                  <LedgerRow
                    key={prediction.id}
                    prediction={prediction}
                    index={index}
                  />
                ))}
            </ol>
          </section>
        </>
      ) : null}

      {pending.length ? (
        <section className="mt-10 border border-rule bg-leaf px-5 py-5">
          <p className="type-eyebrow">Waiting on reality</p>
          <ul className="mt-4 space-y-4">
            {pending.map((prediction) => (
              <li key={prediction.id} className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="max-w-[56ch] text-[15px] leading-snug text-ink">
                  {prediction.statement}
                </p>
                <p className="type-figure text-[13px] text-graphite">
                  {formatNum(prediction.expectedValue)} {prediction.unit} · due{" "}
                  {formatDay(prediction.deadline)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {bands.length ? (
        <>
          <InkRule className="my-12" />
          <section>
            <h2 className="type-eyebrow">Accuracy by kind of estimate</h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-2">
              {bands
                .slice()
                .sort((a, b) => b.accuracy - a.accuracy)
                .map((band) => (
                  <li key={band.domain} className="border border-rule bg-paper px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[16px] text-ink">
                        {DOMAIN_LABEL[band.domain]}
                      </span>
                      <span className="type-figure text-[18px] tabular-nums text-ink">
                        {band.accuracy}%
                      </span>
                    </div>
                    <HatchMeter
                      value={band.accuracy}
                      strokes={28}
                      tone={
                        band.accuracy >= 75
                          ? "ink"
                          : band.accuracy >= 55
                            ? "ochre"
                            : "oxblood"
                      }
                      className="mt-3"
                      label={`${DOMAIN_LABEL[band.domain]}: ${band.accuracy}% accurate`}
                    />
                    <p className="type-eyebrow mt-2">
                      {`${band.sampleSize} outcome${band.sampleSize === 1 ? "" : "s"}`}
                      {band.meanRatio !== null
                        ? ` · on average you ${
                            band.meanRatio > 1.05
                              ? `expected ${band.meanRatio.toFixed(1)}× more than happened`
                              : band.meanRatio < 0.95
                                ? `expected ${(1 / band.meanRatio).toFixed(1)}× less than happened`
                                : "landed close"
                          }`
                        : ""}
                    </p>
                  </li>
                ))}
            </ul>
          </section>
        </>
      ) : null}

      {patterns.length ? (
        <>
          <InkRule className="my-12" />
          <section>
            <h2 className="type-eyebrow">What this means for the next round</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {patterns.map((pattern) => (
                <li
                  key={pattern.id}
                  className="border border-oxblood bg-oxblood-wash px-5 py-5"
                >
                  <p className="type-eyebrow text-oxblood">{pattern.domain}</p>
                  <p className="type-display mt-3 text-[20px] leading-snug text-ink">
                    {pattern.insight}
                  </p>
                  <p className="type-eyebrow mt-3">
                    {pattern.sampleSize} outcomes · {pattern.confidence}% confidence
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {decisions.length ? (
        <>
          <InkRule className="my-12" />
          <section>
            <h2 className="type-eyebrow">Decisions on the record</h2>
            <ul className="mt-6 grid gap-4 lg:grid-cols-2">
              {decisions.map((decision, index) => {
                const outcome = outcomeByDecision.get(decision.id);
                const related = predictions.filter(
                  (item) => item.decisionId === decision.id,
                );
                return (
                  <li
                    key={decision.id}
                    className="flex flex-col border border-rule bg-leaf px-5 py-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="type-figure text-[12px] text-pencil">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "type-eyebrow px-1.5 py-0.5",
                          decision.status === "committed"
                            ? "bg-moss-wash text-moss"
                            : decision.status === "open"
                              ? "bg-indigo-wash text-indigo"
                              : "bg-tape text-graphite",
                        )}
                      >
                        {decision.status}
                      </span>
                    </div>
                    <p className="type-display mt-3 text-[18px] font-semibold leading-snug">
                      {decision.question}
                    </p>
                    {decision.commitmentRationale ? (
                      <p className="mt-3 text-[14px] leading-relaxed text-graphite">
                        {decision.commitmentRationale}
                      </p>
                    ) : null}
                    {outcome ? (
                      <p className="mt-4 border-t border-rule pt-3 text-[14.5px] leading-relaxed text-ink">
                        <span className="type-eyebrow mr-2 text-oxblood">
                          {outcome.result}
                        </span>
                        {outcome.lesson}
                      </p>
                    ) : null}
                    {related.length ? (
                      <p className="type-eyebrow mt-4">
                        {related
                          .map(
                            (item) =>
                              `${item.status === "pending" ? "pending" : `${accuracyOf(item)}%`} ${item.metric}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}

      <InkRule className="my-12" />

      <div className="flex flex-wrap gap-3">
        <Button asChild className="h-10 px-5">
          <Link href="/arena">Open a decision</Link>
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link href="/history">Record an outcome</Link>
        </Button>
      </div>
    </div>
  );
}

function LedgerRow({
  prediction,
  index,
}: {
  prediction: Prediction;
  index: number;
}) {
  const actual = prediction.actualValue ?? 0;
  const ratio = prediction.ratio ?? 1;
  const over = ratio > 1.05;
  const accuracy = accuracyOf(prediction);

  return (
    <li className="grid gap-4 bg-paper px-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(12rem,16rem)] sm:items-end">
      <span className="type-figure text-[12px] text-pencil">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="text-[16px] leading-snug text-ink">{prediction.statement}</p>
        <p className="type-eyebrow mt-2">
          {DOMAIN_LABEL[prediction.domain]} · {formatDay(prediction.deadline)}
        </p>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="type-eyebrow text-indigo">
            said {formatNum(prediction.expectedValue)}
          </p>
          <p className="type-eyebrow text-oxblood">
            was {formatNum(actual)}
          </p>
        </div>
        <HatchMeter
          value={accuracy}
          tone={
            prediction.status === "hit"
              ? "ink"
              : prediction.status === "partial"
                ? "ochre"
                : "oxblood"
          }
          strokes={16}
          className="mt-2"
          label={`${accuracy}% accurate`}
        />
        <p className="type-eyebrow mt-1.5">
          {prediction.status}
          {over
            ? ` · ${ratio.toFixed(1)}× high`
            : ratio < 0.95
              ? ` · ${(1 / ratio).toFixed(1)}× low`
              : " · on the number"}
        </p>
      </div>
    </li>
  );
}

function formatNum(value: number) {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
