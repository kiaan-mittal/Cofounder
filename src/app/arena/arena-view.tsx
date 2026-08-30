"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { AgentConsole } from "@/components/arena/agent-console";
import { CommitFlow } from "@/components/arena/commit-flow";
import { DecisionBoard } from "@/components/arena/decision-board";
import { DecisionGallery, DecisionRail } from "@/components/arena/decision-rail";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { TableSketch } from "@/components/ink/table-drawings";
import { HatchMeter } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PERSPECTIVES } from "@/lib/perspectives";
import {
  actionItemsFor,
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  reassessmentsFor,
  risksFor,
} from "@/lib/selectors";
import { readArenaDraft, writeArenaDraft } from "@/lib/drafts";
import { useArena } from "@/lib/store";
import { useDebate, type ReadinessResponse } from "@/lib/use-debate";
import type { Company, Decision } from "@/lib/types";

export function ArenaView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {(company) => <ArenaShell company={company} />}
    </RequireCompany>
  );
}

function ArenaShell({ company }: { company: Company }) {
  const decisions = useArena((state) => state.decisions);
  const activeDecisionId = useArena((state) => state.activeDecisionId);
  const argumentList = useArena((state) => state.argumentList);

  const decision = useMemo(() => {
    if (activeDecisionId) {
      const found = decisions.find((d) => d.id === activeDecisionId);
      if (found) return found;
    }
    // Without an explicit choice, only fall back to a decision that has an
    // argued round — otherwise the founder should be asked what they are
    // deciding rather than dropped into an empty table.
    const argued = new Set(argumentList.map((argument) => argument.decisionId));
    return (
      decisions.find(
        (d) =>
          (d.status === "open" || d.status === "investigating") &&
          argued.has(d.id),
      ) ?? null
    );
  }, [decisions, activeDecisionId, argumentList]);

  if (!decision) return <DecisionStart company={company} />;
  return <Workspace decision={decision} company={company} />;
}

/* ------------------------------------------------------------------ */
/* Opening a decision                                                  */
/* ------------------------------------------------------------------ */

function queryQuestion(params: URLSearchParams) {
  return (
    params.get("q")?.trim() ||
    params.get("question")?.trim() ||
    ""
  );
}

function queryContext(params: URLSearchParams) {
  return params.get("c")?.trim() || params.get("context")?.trim() || "";
}

function DecisionStart({ company }: { company: Company }) {
  const { busy, error, open, openingReady } = useDebate();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(
    () => queryQuestion(searchParams) || readArenaDraft().question,
  );
  const [context, setContext] = useState(() => {
    const fromQuery = queryQuestion(searchParams);
    const fromContext = queryContext(searchParams);
    return fromQuery ? fromContext : readArenaDraft().context;
  });
  const setActiveDecision = useArena((state) => state.setActiveDecision);
  const decisions = useArena((state) => state.decisions);

  useEffect(() => {
    const fromQuery = queryQuestion(searchParams);
    const fromContext = queryContext(searchParams);
    if (!fromQuery) return;
    setQuestion(fromQuery);
    setContext(fromContext);
    writeArenaDraft({ question: fromQuery, context: fromContext });
  }, [searchParams]);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length < 8) return;
    await open(question.trim(), context.trim());
  }

  if (busy === "opening") {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-16">
        <p className="type-eyebrow">Opening the round</p>
        <h1 className="type-display mt-5 max-w-[22ch] text-[clamp(2rem,4.5vw,3rem)] font-semibold">
          Five specialists are writing onto the table.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-graphite">
          {question}
        </p>
        <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-graphite">
          They read the Company Brain, your record, and then place cards you
          cannot dismiss by scrolling.
        </p>
        <div className="mt-10 border border-rule bg-leaf paper-grid px-4 py-4">
          <TableSketch
            writing={PERSPECTIVES.map((item) => item.id).filter(
              (id) => !openingReady.includes(id),
            )}
            ready={openingReady}
            filled={[]}
          />
          <ul className="mt-2 flex justify-between px-2">
            {PERSPECTIVES.map((perspective) => {
              const ready = openingReady.includes(perspective.id);
              return (
                <li key={perspective.id} className="flex flex-col items-center gap-1">
                  <PerspectiveEmblem
                    perspective={perspective.id}
                    className="size-12"
                  />
                  <span
                    className={
                      ready
                        ? "type-eyebrow text-moss"
                        : "type-eyebrow animate-pulse"
                    }
                  >
                    {ready ? "ready" : "writing"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-14 lg:py-20">
      <DecisionRail />
      <div className="mt-10 grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
        <div>
          <p className="type-eyebrow">The Arena · {company.name}</p>
          <h1 className="type-display mt-5 text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.02]">
            What are you deciding?
          </h1>

          <form
            onSubmit={start}
            action="#"
            className="mt-10 max-w-[54ch] space-y-6"
          >
            <Field
              id="question"
              label="The decision"
              hint="A question with more than one honest answer."
            >
              <Textarea
                id="question"
                name="question"
                value={question}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuestion(value);
                  writeArenaDraft({ question: value, context });
                }}
                placeholder="Should I launch now or spend another month polishing?"
                rows={3}
                className="type-display min-h-[108px] text-[22px] leading-snug"
              />
            </Field>

            <Field
              id="context"
              label="What the sources cannot see"
              hint="Runway, a conversation last week, a constraint that is not public."
              optional
            >
              <Textarea
                id="context"
                name="context"
                value={context}
                onChange={(event) => {
                  const value = event.target.value;
                  setContext(value);
                  writeArenaDraft({ question, context: value });
                }}
                placeholder="Nine months of runway. The waitlist has gone cold."
                rows={3}
              />
            </Field>

            {error ? (
              <div className="mt-6 border border-rule bg-oxblood-wash px-4 py-3">
                <p className="text-sm text-ink">{error.message}</p>
                {error.hint ? (
                  <p className="mt-1.5 text-[13px] text-graphite">{error.hint}</p>
                ) : null}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={question.trim().length < 8}
              className="mt-8 h-11 px-6 text-[15px]"
            >
              Open the round
            </Button>
          </form>

          {decisions.length ? (
            <div className="mt-14 border-t border-rule pt-8">
              <DecisionGallery
                decisions={decisions}
                onOpen={setActiveDecision}
              />
            </div>
          ) : null}
        </div>

        <aside className="border border-rule bg-leaf paper-grid px-4 pb-5 pt-4">
          <p className="type-eyebrow">Who sits opposite you</p>
          <TableSketch writing={[]} ready={[]} filled={[]} />
          <ul className="mt-2 flex justify-between px-1">
            {PERSPECTIVES.map((perspective) => (
              <li key={perspective.id} className="flex flex-col items-center gap-1">
                <PerspectiveEmblem
                  perspective={perspective.id}
                  className="size-10"
                />
                <span className="type-eyebrow">{perspective.mark}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The workspace                                                       */
/* ------------------------------------------------------------------ */

function Workspace({
  decision,
  company,
}: {
  decision: Decision;
  company: Company;
}) {
  const { busy, error, defend, summarise, open: openRound, openingReady } =
    useDebate();

  // These derive new arrays on every call, so they are wrapped in useShallow:
  // Zustand v5 re-runs the selector on each render and requires a stable
  // snapshot, and an unwrapped filter here loops forever.
  const args = useArena(useShallow((state) => argumentsFor(state, decision.id)));
  const reassessments = useArena(
    useShallow((state) => reassessmentsFor(state, decision.id)),
  );
  const risks = useArena(useShallow((state) => risksFor(state, decision.id)));
  const evidence = useArena(
    useShallow((state) => evidenceFor(state, decision.id)),
  );
  const contradictions = useArena(
    useShallow((state) => contradictionsFor(state, decision.id)),
  );
  const actionItems = useArena(
    useShallow((state) => actionItemsFor(state, decision.id)),
  );
  const spotlightId = useArena((state) => state.spotlightId);
  const pendingCommit = useArena((state) => state.pendingCommit);
  const updateDecision = useArena((state) => state.updateDecision);

  const [defense, setDefense] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [summary, setSummary] = useState<ReadinessResponse | null>(null);

  const committed = decision.status === "committed";

  // An agent's proposal should pull the founder into the commit decision
  // rather than sitting quietly in the margin.
  useEffect(() => {
    if (pendingCommit?.decisionId === decision.id && !committed) {
      setCommitOpen(true);
    }
  }, [pendingCommit, decision.id, committed]);

  async function submitDefense() {
    if (defense.trim().length < 3) return;
    const text = defense.trim();
    setDefense("");
    const targetId = target;
    setTarget(null);
    await defend(decision.id, text, targetId);
  }

  async function openCommit() {
    setCommitOpen(true);
    setSummary(null);
    const result = await summarise(decision.id);
    setSummary(result);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 lg:py-14">
      <DecisionRail currentId={decision.id} />

      <header className="mt-8">
        <p className="type-eyebrow">
          Round {decision.round} · {decision.status}
        </p>
        <h1 className="type-display mt-3 max-w-[28ch] text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-[1.08]">
          {decision.question}
        </h1>
        {decision.options.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {decision.options.map((option, index) => (
              <li
                key={option.id}
                className={`border px-3 py-1.5 text-[14px] ${
                  decision.chosenOptionId === option.id
                    ? "border-ink bg-leaf"
                    : "border-rule"
                }`}
              >
                <span className="type-figure mr-2 text-pencil">
                  {String.fromCharCode(65 + index)}
                </span>
                {option.label}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="mt-10">
        <DecisionBoard
          decision={decision}
          companyName={company.name}
          args={args}
          reassessments={reassessments}
          risks={risks}
          evidence={evidence}
          contradictions={contradictions}
          actionItems={actionItems}
          spotlightId={spotlightId}
          busy={busy}
          openingReady={openingReady}
          defense={defense}
          target={target}
          onDefenseChange={setDefense}
          onTarget={setTarget}
          onSubmitDefense={submitDefense}
          onOpenRound={() =>
            openRound(decision.question, decision.context, decision.id)
          }
        />
      </div>

      {error ? (
        <div className="mt-6 border border-rule bg-oxblood-wash px-4 py-3">
          <p className="text-sm text-ink">{error.message}</p>
          {error.hint ? (
            <p className="mt-1.5 text-[13px] text-graphite">{error.hint}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10">
        <AgentConsole />
      </div>

      {/* Decision status */}
      <div className="sticky bottom-0 z-30 mt-14 border-t border-rule bg-paper/95 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-8">
          <div className="min-w-[180px] flex-1">
            <label
              htmlFor="founder-confidence"
              className="type-eyebrow flex items-baseline justify-between"
            >
              <span className="text-indigo">Your confidence</span>
              <span className="type-figure text-ink">
                {decision.founderConfidence}
              </span>
            </label>
            <input
              id="founder-confidence"
              type="range"
              min={0}
              max={100}
              value={decision.founderConfidence}
              disabled={committed}
              onChange={(event) =>
                updateDecision(decision.id, {
                  founderConfidence: Number(event.target.value),
                })
              }
              className="mt-2 w-full accent-[var(--indigo)]"
            />
          </div>

          <div className="min-w-[180px] flex-1">
            <p className="type-eyebrow flex items-baseline justify-between">
              <span className="text-oxblood">The Arena&rsquo;s confidence</span>
              <span className="type-figure text-ink">
                {decision.agentConfidence}
              </span>
            </p>
            <HatchMeter
              value={decision.agentConfidence}
              tone="oxblood"
              className="mt-2"
            />
          </div>

          <div className="flex items-center gap-2">
            {committed ? (
              <>
                <span className="type-eyebrow text-moss">committed</span>
                <Button asChild variant="outline" className="h-10">
                  <Link href="/history">Open the record</Link>
                </Button>
              </>
            ) : (
              <Button
                onClick={openCommit}
                disabled={busy !== null || args.length === 0}
                className="h-10 px-6"
              >
                Weigh it up
              </Button>
            )}
          </div>
        </div>
      </div>

      <CommitFlow
        decision={decision}
        summary={summary}
        open={commitOpen}
        onOpenChange={setCommitOpen}
        loading={busy === "readiness"}
      />
    </div>
  );
}
