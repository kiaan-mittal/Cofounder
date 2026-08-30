"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ArenaPath } from "@/components/arena/the-loop";
import { HatchMeter, InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { DOMAIN_LABEL, calibrationBands, detectPatterns } from "@/lib/calibration";
import { useArena } from "@/lib/store";

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
  const patterns = useArena((state) => state.patterns);
  const setPatterns = useArena((state) => state.setPatterns);

  useEffect(() => {
    if (!company) return;
    setPatterns(detectPatterns(company.id, predictions, decisions));
  }, [company, decisions, predictions, setPatterns]);

  const bands = calibrationBands(predictions);
  const evaluated = predictions.filter((p) => p.status !== "pending");
  const pending = predictions.filter((p) => p.status === "pending");
  const reliable = evaluated.length >= 3;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <ArenaPath here="calibrate" />
      <header className="mt-8 max-w-[52ch]">
        <p className="type-eyebrow">Founder calibration</p>
        <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3rem)] font-semibold">
          Where your judgement is reliable, and where it isn&rsquo;t.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-graphite">
          {evaluated.length === 0
            ? pending.length
              ? `${pending.length} prediction${pending.length === 1 ? " is" : "s are"} waiting on reality. Record the real number on History when the deadline lands.`
              : "No predictions have met reality yet. Commit a decision, attach a number, then come back."
            : `Measured from ${evaluated.length} prediction${evaluated.length === 1 ? "" : "s"} that ${evaluated.length === 1 ? "has" : "have"} met reality. Nothing here is an opinion — it is arithmetic on numbers you wrote down before the fact.`}
        </p>
      </header>

      {pending.length ? (
        <section className="mt-10 max-w-[720px] border border-rule bg-leaf px-5 py-4">
          <p className="type-eyebrow">Waiting on reality</p>
          <ul className="mt-3 space-y-3">
            {pending.map((prediction) => (
              <li key={prediction.id}>
                <p className="text-[15px] leading-snug text-ink">
                  {prediction.statement}
                </p>
                <p className="type-eyebrow mt-1">
                  {prediction.expectedValue} {prediction.unit} · due{" "}
                  {new Date(prediction.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!reliable && evaluated.length === 0 && pending.length === 0 ? (
        <div className="mt-8 max-w-[62ch] border border-rule bg-ochre-wash px-4 py-3">
          <p className="text-[14.5px] leading-relaxed text-ink">
            Three scored outcomes are enough for the Arena to argue from your
            record. Until then it will say the sample is too small rather than
            invent a profile.
          </p>
        </div>
      ) : null}

      {evaluated.length > 0 && evaluated.length < 3 ? (
        <div className="mt-8 max-w-[62ch] border border-rule bg-ochre-wash px-4 py-3">
          <p className="text-[14.5px] leading-relaxed text-ink">
            {evaluated.length} outcome{evaluated.length === 1 ? " has" : "s have"}{" "}
            been recorded. The Arena will not argue from this sample until there
            are at least three.
          </p>
        </div>
      ) : null}

      {bands.length ? (
        <>
          <InkRule className="my-12" />
          <section>
            <h2 className="type-eyebrow">Accuracy by kind of estimate</h2>
            <ul className="mt-8 max-w-[720px] space-y-7">
              {bands
                .slice()
                .sort((a, b) => b.accuracy - a.accuracy)
                .map((band) => (
                  <li key={band.domain}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[16px] text-ink">
                        {DOMAIN_LABEL[band.domain]}
                      </span>
                      <span className="type-figure text-[15px] text-ink">
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
                      className="mt-2"
                      label={`${DOMAIN_LABEL[band.domain]}: ${band.accuracy}% accurate`}
                    />
                    <p className="type-eyebrow mt-1.5">
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
            <h2 className="type-eyebrow">What this means for your next decision</h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:gap-10">
              {patterns.map((pattern) => (
                <li
                  key={pattern.id}
                  className="border border-rule bg-leaf px-5 py-4"
                >
                  <p className="type-display text-[19px] leading-snug text-ink">
                    {pattern.insight}
                  </p>
                  <p className="type-eyebrow mt-2.5">
                    {pattern.domain} · {pattern.sampleSize} outcomes ·{" "}
                    {pattern.confidence}% confidence
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
            <ul className="mt-6 max-w-[720px] divide-y divide-rule border border-rule">
              {decisions.slice(0, 6).map((decision) => (
                <li key={decision.id} className="px-4 py-3">
                  <p className="text-[15px] leading-snug text-ink">
                    {decision.question}
                  </p>
                  <p className="type-eyebrow mt-1">
                    {decision.status} · your {decision.founderConfidence} · arena{" "}
                    {decision.agentConfidence}
                  </p>
                </li>
              ))}
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
