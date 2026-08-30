"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { HatchMeter, InkRule } from "@/components/ink/marks";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calibrationWarning, detectPatterns } from "@/lib/calibration";
import { id, now } from "@/lib/id";
import { readiness } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { CompanyBrain, Decision, PredictionDomain } from "@/lib/types";
import type { ReadinessResponse } from "@/lib/use-debate";

/**
 * Commitment, then prediction.
 *
 * The Arena refuses to let a decision end as a conversation: committing leads
 * straight into "what would prove you right", because a decision with no
 * falsifiable expectation attached cannot teach the founder anything later.
 */

type Stage = "readiness" | "prediction" | "done";

/** Shared empty array so the selector below keeps a stable identity. */
const EMPTY_ASSUMPTIONS: CompanyBrain["assumptions"] = [];

const DOMAIN_OPTIONS: Array<{ value: PredictionDomain; label: string }> = [
  { value: "growth", label: "Growth" },
  { value: "revenue", label: "Revenue" },
  { value: "timeline", label: "Timeline" },
  { value: "technical", label: "Technical" },
  { value: "retention", label: "Retention" },
  { value: "distribution", label: "Distribution" },
  { value: "other", label: "Other" },
];

export function CommitFlow({
  decision,
  summary,
  open,
  onOpenChange,
  loading,
}: {
  decision: Decision;
  summary: ReadinessResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}) {
  const [stage, setStage] = useState<Stage>("readiness");
  const [optionId, setOptionId] = useState(decision.options[0]?.id ?? "");
  const [rationale, setRationale] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const pendingCommit = useArena((state) => state.pendingCommit);
  const blockers = useArena(
    useShallow((state) => readiness(state, decision.id).blockers),
  );

  useEffect(() => {
    if (!open) {
      setStage("readiness");
      setAcknowledged(false);
      return;
    }
    if (decision.status === "committed") {
      setStage("prediction");
    }
  }, [open, decision.status]);

  // An agent may have staged a commitment; pre-fill it so the founder is
  // confirming the agent's proposal rather than retyping it.
  useEffect(() => {
    if (pendingCommit?.decisionId === decision.id) {
      setOptionId(pendingCommit.optionId);
      setRationale((current) => current || pendingCommit.rationale);
    }
  }, [pendingCommit, decision.id]);

  const argumentList = useArena((state) => state.argumentList);
  const assumptions = useArena(
    (state) => state.company?.brain.assumptions ?? EMPTY_ASSUMPTIONS,
  );

  const argumentById = useMemo(
    () => Object.fromEntries(argumentList.map((a) => [a.id, a])),
    [argumentList],
  );
  const assumptionById = useMemo(
    () => Object.fromEntries(assumptions.map((a) => [a.id, a])),
    [assumptions],
  );

  function commit() {
    const option = decision.options.find((o) => o.id === optionId);
    if (!option) return;

    useArena.getState().updateDecision(decision.id, {
      status: "committed",
      chosenOptionId: option.id,
      commitmentRationale: rationale.trim(),
      committedAt: now(),
    });
    useArena.getState().proposeCommit(null);
    setStage("prediction");
  }

  function investigate() {
    useArena.getState().updateDecision(decision.id, { status: "investigating" });
    toast("Marked for investigation", {
      description: "Deferral is a decision too — it will show in your record.",
    });
    onOpenChange(false);
  }

  function abandon() {
    useArena.getState().updateDecision(decision.id, { status: "abandoned" });
    toast("Decision killed");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-none border-rule p-8">
        {stage === "readiness" ? (
          <ReadinessStage
            decision={decision}
            summary={summary}
            loading={loading}
            blockers={blockers}
            acknowledged={acknowledged}
            setAcknowledged={setAcknowledged}
            optionId={optionId}
            setOptionId={setOptionId}
            rationale={rationale}
            setRationale={setRationale}
            argumentById={argumentById}
            assumptionById={assumptionById}
            pendingCommitRationale={
              pendingCommit?.decisionId === decision.id
                ? pendingCommit.rationale
                : null
            }
            onCommit={commit}
            onInvestigate={investigate}
            onAbandon={abandon}
          />
        ) : stage === "prediction" ? (
          <PredictionStage
            decision={decision}
            onDone={() => {
              setStage("done");
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReadinessStage({
  decision,
  summary,
  loading,
  blockers,
  acknowledged,
  setAcknowledged,
  optionId,
  setOptionId,
  rationale,
  setRationale,
  argumentById,
  assumptionById,
  pendingCommitRationale,
  onCommit,
  onInvestigate,
  onAbandon,
}: {
  decision: Decision;
  summary: ReadinessResponse | null;
  loading: boolean;
  blockers: string[];
  acknowledged: boolean;
  setAcknowledged: (value: boolean) => void;
  optionId: string;
  setOptionId: (value: string) => void;
  rationale: string;
  setRationale: (value: string) => void;
  argumentById: Record<string, { claim: string } | undefined>;
  assumptionById: Record<string, { statement: string } | undefined>;
  pendingCommitRationale: string | null;
  onCommit: () => void;
  onInvestigate: () => void;
  onAbandon: () => void;
}) {
  const blocked = blockers.length > 0 && !acknowledged;

  return (
    <>
      <DialogHeader className="text-left">
        <p className="type-eyebrow">
          Weigh it up · Round {decision.round} · {decision.status}
        </p>
        <DialogTitle className="type-display mt-2 text-[28px] font-semibold leading-tight">
          {decision.question}
        </DialogTitle>
        <p className="mt-3 text-[14px] leading-relaxed text-graphite">
          Status is {decision.status}. Commit it, mark it for investigation, or
          kill it. A prediction follows a commit.
        </p>
        <DialogDescription className="sr-only">
          Review the strongest arguments and unresolved risks, then commit,
          investigate or kill this decision.
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <p className="type-eyebrow animate-pulse py-8">
          Weighing where the debate landed…
        </p>
      ) : summary ? (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Note label="Strongest argument for">
              {argumentById[summary.strongestForId ?? ""]?.claim ??
                "Nothing argued convincingly for this."}
            </Note>
            <Note label="Strongest argument against">
              {argumentById[summary.strongestAgainstId ?? ""]?.claim ??
                "Nothing argued convincingly against this."}
            </Note>
          </div>

          <Note label="Biggest unresolved risk">
            {summary.biggestUnresolvedRisk}
          </Note>

          <Note label="Assumption most likely to invalidate this">
            {assumptionById[summary.keyAssumptionId ?? ""]?.statement ??
              summary.keyAssumptionNote}
            {assumptionById[summary.keyAssumptionId ?? ""] ? (
              <span className="mt-1.5 block text-[13.5px] text-graphite">
                {summary.keyAssumptionNote}
              </span>
            ) : null}
          </Note>

          <Note label="Cheapest test that would change your mind">
            {summary.recommendedTest}
          </Note>

          <div className="border border-rule bg-oxblood-wash px-4 py-3">
            <p className="type-eyebrow text-oxblood">The Arena&rsquo;s view</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
              {summary.verdict}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Confidence
              label="Your confidence"
              value={decision.founderConfidence}
              tone="indigo"
            />
            <Confidence
              label="The Arena's confidence"
              value={summary.arenaConfidence ?? decision.agentConfidence}
              tone="oxblood"
            />
          </div>
        </div>
      ) : (
        <p className="py-6 text-[15px] leading-relaxed text-graphite">
          The summary could not be generated, but you can still commit. The
          arguments and risks on the page are unchanged.
        </p>
      )}

      <InkRule className="my-2" />

      {pendingCommitRationale ? (
        <div className="border border-rule bg-oxblood-wash px-4 py-3">
          <p className="type-eyebrow text-oxblood">
            An agent proposed this commitment
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink">
            {pendingCommitRationale}
          </p>
          <p className="mt-2 text-[13px] text-graphite">
            It cannot commit for you. Confirm it below or change it.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <Label className="type-eyebrow">What are you committing to?</Label>
          <div className="mt-3 space-y-2">
            {decision.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer gap-3 border p-4 transition-colors ${
                  optionId === option.id
                    ? "border-ink bg-leaf"
                    : "border-rule hover:border-rule-strong"
                }`}
              >
                <input
                  type="radio"
                  name="commit-option"
                  checked={optionId === option.id}
                  onChange={() => setOptionId(option.id)}
                  className="mt-1 size-3.5 accent-[var(--ink)]"
                />
                <span>
                  <span className="block text-[15px] font-medium text-ink">
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

        <Field
          id="rationale"
          label="Why, in one or two sentences"
          hint="You will read this again when the outcome lands."
        >
          <Textarea
            id="rationale"
            name="rationale"
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            placeholder="The cheapest thing we can buy right now is whether anyone pays."
          />
        </Field>

        {blockers.length ? (
          <div className="border border-rule bg-oxblood-wash px-4 py-3">
            <p className="type-eyebrow text-oxblood">
              {`${blockers.length} thing${blockers.length === 1 ? "" : "s"} still unresolved`}
            </p>
            <ul className="mt-2 space-y-1 text-[13.5px] leading-relaxed text-ink">
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
              <span className="text-[13.5px] text-ink">
                Commit anyway. I am choosing to carry these.
              </span>
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          onClick={onCommit}
          disabled={blocked || !optionId}
          className="h-10 px-6"
        >
          Commit
        </Button>
        <Button variant="outline" onClick={onInvestigate} className="h-10">
          Investigate
        </Button>
        <Button
          variant="ghost"
          onClick={onAbandon}
          className="type-eyebrow ml-auto text-oxblood"
        >
          Kill
        </Button>
      </div>
    </>
  );
}

function PredictionStage({
  decision,
  onDone,
}: {
  decision: Decision;
  onDone: () => void;
}) {
  const patterns = useArena((state) => state.patterns);
  const addPrediction = useArena((state) => state.addPrediction);

  const [statement, setStatement] = useState("");
  const [metric, setMetric] = useState("");
  const [expected, setExpected] = useState("");
  const [unit, setUnit] = useState("");
  const [days, setDays] = useState("30");
  const [confidence, setConfidence] = useState("70");
  const [domain, setDomain] = useState<PredictionDomain>("growth");

  const expectedValue = Number(expected);
  const warning = useMemo(
    () =>
      Number.isFinite(expectedValue) && expectedValue > 0
        ? calibrationWarning(domain, expectedValue, patterns)
        : null,
    [domain, expectedValue, patterns],
  );

  function record() {
    if (!Number.isFinite(expectedValue)) return;

    addPrediction({
      id: id("pred"),
      decisionId: decision.id,
      companyId: decision.companyId,
      statement: statement.trim() || `${expected} ${unit} within ${days} days`,
      domain,
      metric: metric.trim() || unit.trim() || "outcome",
      expectedValue,
      unit: unit.trim() || "units",
      deadline: new Date(
        Date.now() + Math.max(1, Number(days) || 30) * 86_400_000,
      ).toISOString(),
      confidence: Math.max(0, Math.min(100, Number(confidence) || 70)),
      status: "pending",
      createdBy: "founder",
      createdAt: now(),
    });

    const state = useArena.getState();
    if (state.company) {
      state.setPatterns(
        detectPatterns(state.company.id, state.predictions, state.decisions),
      );
    }

    toast("Prediction recorded", {
      description: "Come back when the deadline lands and enter the real number.",
    });
    onDone();
  }

  return (
    <>
      <DialogHeader className="text-left">
        <p className="type-eyebrow">Committed</p>
        <DialogTitle className="type-display mt-2 text-[30px] font-semibold leading-tight">
          What would prove you right?
        </DialogTitle>
        <DialogDescription className="mt-3 text-[15px] leading-relaxed text-graphite">
          One number, one unit, one deadline. This is what your calibration will
          be measured against — and what the Arena will quote back at you next
          time.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <Field id="statement" label="The prediction">
          <Input
            id="statement"
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="100 qualified users within 30 days"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="expected" label="Number">
            <Input
              id="expected"
              inputMode="numeric"
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="100"
              className="type-figure"
            />
          </Field>
          <Field id="unit" label="Unit">
            <Input
              id="unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="qualified users"
            />
          </Field>
          <Field id="days" label="Within (days)">
            <Input
              id="days"
              inputMode="numeric"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="type-figure"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            id="metric"
            label="What you will count"
            className="sm:col-span-2"
          >
            <Input
              id="metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
              placeholder="signups that complete onboarding"
            />
          </Field>
          <Field id="confidence" label="Confidence">
            <Input
              id="confidence"
              inputMode="numeric"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
              className="type-figure"
            />
          </Field>
        </div>

        <div>
          <Label className="type-eyebrow">Which kind of estimate is this?</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DOMAIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDomain(option.value)}
                className={`type-eyebrow border px-3 py-1.5 transition-colors ${
                  domain === option.value
                    ? "border-ink bg-ink text-paper"
                    : "border-rule hover:border-rule-strong"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {warning ? (
          <div className="border border-rule bg-oxblood-wash px-4 py-3">
            <p className="type-eyebrow text-oxblood">Calibration warning</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
              {warning.insight}
            </p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
              Adjusted for that record, the comparable figure is about{" "}
              <span className="type-figure ink-highlight">
                {warning.adjusted} {unit || "units"}
              </span>
              . Defend the {expected} if you still believe it.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button
          onClick={record}
          disabled={!Number.isFinite(expectedValue) || !expected}
          className="h-10 px-6"
        >
          Record prediction
        </Button>
        <Button variant="ghost" onClick={onDone} className="type-eyebrow">
          Skip — no measurable expectation
        </Button>
      </div>
    </>
  );
}

function Note({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="type-eyebrow">{label}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Confidence({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "indigo" | "oxblood";
}) {
  return (
    <div>
      <p className="type-eyebrow flex items-baseline justify-between">
        <span>{label}</span>
        <span className="type-figure text-ink">{value}</span>
      </p>
      <HatchMeter value={value} tone={tone} className="mt-1.5" strokes={20} />
    </div>
  );
}
