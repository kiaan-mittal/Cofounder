"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { HatchMeter } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { readiness } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Argument, Decision } from "@/lib/types";
import type { ReadinessResponse } from "@/lib/use-debate";
import { runTool } from "@/webmcp/run";

export function DecisionReady({
  decision,
  args,
  summary,
  loading,
  onBack,
  onCommitted,
}: {
  decision: Decision;
  args: Argument[];
  summary: ReadinessResponse | null;
  loading: boolean;
  onBack: () => void;
  onCommitted: () => void;
}) {
  const blockers = useArena(
    useShallow((state) => readiness(state, decision.id).blockers),
  );
  const [optionId, setOptionId] = useState(decision.options[0]?.id ?? "");
  const [rationale, setRationale] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = blockers.length > 0 && !acknowledged;
  const forArg =
    args.find((item) => item.id === summary?.strongestForId) ??
    strongest(args, "for");
  const againstArg =
    args.find((item) => item.id === summary?.strongestAgainstId) ??
    strongest(args, "against");
  const unresolved =
    summary?.biggestUnresolvedRisk ??
    "The risk still on the board has not been named.";
  const test =
    summary?.recommendedTest ??
    "Name the cheapest test that would change your mind.";

  async function commit() {
    const option = decision.options.find((item) => item.id === optionId);
    if (!option) return;
    await runTool(
      "confirm_commit",
      {
        option: option.id,
        rationale: rationale.trim(),
        decision_id: decision.id,
      },
      { channel: "founder" },
    );
    onCommitted();
  }

  function investigate() {
    void runTool(
      "set_decision_status",
      { status: "investigating", decision_id: decision.id },
      { channel: "founder" },
    );
    toast("Marked for investigation", {
      description: "Back on the floor. Deferral is on the record.",
    });
    onBack();
  }

  function kill() {
    void runTool(
      "set_decision_status",
      { status: "abandoned", decision_id: decision.id },
      { channel: "founder" },
    );
    toast("Decision killed");
    onBack();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-5 py-8">
        <button
          type="button"
          onClick={onBack}
          className="type-eyebrow text-graphite underline underline-offset-4 hover:text-ink"
        >
          The floor
        </button>
        <p className="type-eyebrow mt-6">Decision ready</p>
        <h1 className="type-display mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight">
          {decision.question}
        </h1>
        <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-graphite">
          Strongest for, strongest against, the risk still open, the test that
          would change your mind. Then commit, investigate, or kill it.
        </p>

        {loading ? (
          <p className="type-eyebrow mt-10 animate-pulse text-oxblood">
            Weighing where the debate landed…
          </p>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="grid gap-px bg-rule sm:grid-cols-2">
              <Note label="Strongest argument for">
                {forArg?.claim ?? "Nothing argued convincingly for this."}
              </Note>
              <Note label="Strongest argument against">
                {againstArg?.claim ??
                  "Nothing argued convincingly against this."}
              </Note>
            </div>
            <Note label="Biggest unresolved risk">{unresolved}</Note>
            <Note label="Cheapest test that would change your mind">{test}</Note>
            {summary?.verdict ? (
              <div className="border border-rule bg-oxblood-wash px-4 py-3">
                <p className="type-eyebrow text-oxblood">The Arena’s view</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                  {summary.verdict}
                </p>
              </div>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="type-eyebrow flex items-baseline justify-between text-indigo">
                  <span>Your confidence</span>
                  <span className="type-figure text-ink">
                    {decision.founderConfidence}
                  </span>
                </p>
                <HatchMeter
                  value={decision.founderConfidence}
                  tone="ink"
                  className="mt-2"
                />
              </div>
              <div>
                <p className="type-eyebrow flex items-baseline justify-between text-oxblood">
                  <span>The Arena’s confidence</span>
                  <span className="type-figure text-ink">
                    {summary?.arenaConfidence ?? decision.agentConfidence}
                  </span>
                </p>
                <HatchMeter
                  value={summary?.arenaConfidence ?? decision.agentConfidence}
                  tone="oxblood"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {decision.options.length ? (
          <div className="mt-8">
            <p className="type-eyebrow">What are you committing to?</p>
            <div className="mt-3 space-y-2">
              {decision.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer gap-3 border p-4 ${
                    optionId === option.id
                      ? "border-ink bg-leaf"
                      : "border-rule hover:border-rule-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="ready-option"
                    checked={optionId === option.id}
                    onChange={() => setOptionId(option.id)}
                    className="mt-1 size-3.5 accent-[var(--ink)]"
                  />
                  <span>
                    <span className="block text-[15px] font-medium">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-relaxed text-graphite">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <Field
          id="ready-rationale"
          label="Why, in one or two sentences"
          hint="You will read this again when the outcome lands."
        >
          <Textarea
            id="ready-rationale"
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            placeholder="The cheapest thing we can buy right now is whether anyone pays."
          />
        </Field>

        {blockers.length ? (
          <div className="mt-5 border border-rule bg-oxblood-wash px-4 py-3">
            <p className="type-eyebrow text-oxblood">
              {blockers.length} still unresolved
            </p>
            <ul className="mt-2 space-y-1 text-[13.5px] text-ink">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="size-3.5 accent-[var(--oxblood)]"
              />
              <span className="text-[13.5px]">
                Commit anyway. I am choosing to carry these.
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button
            onClick={commit}
            disabled={blocked || (decision.options.length > 0 && !optionId)}
            className="h-10 px-6"
          >
            Commit
          </Button>
          <Button variant="outline" onClick={investigate} className="h-10">
            Investigate
          </Button>
          <Button
            variant="ghost"
            onClick={kill}
            className="type-eyebrow ml-auto text-oxblood"
          >
            Kill
          </Button>
        </div>
      </div>
    </div>
  );
}

function strongest(args: Argument[], stance: Argument["stance"]) {
  return args
    .filter((item) => item.stance === stance)
    .slice()
    .sort((a, b) => b.strength - a.strength)[0];
}

function Note({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-paper px-4 py-4">
      <p className="type-eyebrow">{label}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}
