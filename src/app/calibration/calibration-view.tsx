"use client";

import Link from "next/link";

import { HatchMeter, InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { DOMAIN_LABEL, calibrationBands } from "@/lib/calibration";
import { useArena } from "@/lib/store";

export function CalibrationView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {() => <Calibration />}
    </RequireCompany>
  );
}

function Calibration() {
  const predictions = useArena((state) => state.predictions);
  const patterns = useArena((state) => state.patterns);

  const bands = calibrationBands(predictions);
  const evaluated = predictions.filter((p) => p.status !== "pending");
  const reliable = evaluated.length >= 3;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <header className="max-w-[52ch]">
        <p className="type-eyebrow">Founder calibration</p>
        <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3rem)] font-semibold">
          Where your judgement is reliable, and where it isn&rsquo;t.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-graphite">
          {`Measured from ${evaluated.length} prediction${evaluated.length === 1 ? "" : "s"} that ${evaluated.length === 1 ? "has" : "have"} met reality.`}{" "}
          Nothing here is an opinion about you — it is arithmetic on numbers you
          wrote down before the fact.
        </p>
      </header>

      {!reliable ? (
        <div className="mt-8 max-w-[62ch] border border-rule bg-ochre-wash px-4 py-3">
          <p className="text-[14.5px] leading-relaxed text-ink">
            {evaluated.length === 0
              ? "No predictions have been evaluated yet, so there is no profile to show. Commit a decision, attach a prediction, and record the real number when the deadline lands."
              : `Only ${evaluated.length} outcome${evaluated.length === 1 ? " has" : "s have"} been recorded. The Arena will not argue from this sample until there are at least three.`}
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
            <p className="mt-10 max-w-[62ch] text-[15px] leading-relaxed text-graphite">
              These are read by the Arena at the start of every round, and by any
              agent that calls{" "}
              <code className="type-figure text-[13px] text-ink">
                get_founder_patterns
              </code>
              . When you type a number that history says is optimistic, you will
              be asked to defend it before you commit.
            </p>
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
