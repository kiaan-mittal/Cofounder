"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { CommitFlow } from "@/components/arena/commit-flow";
import {
  BriefingWrite,
  FloorBar,
  FloorBoard,
  FloorTalk,
  targetSeatLabel,
} from "@/components/arena/floor";
import { DecisionGallery, DecisionRail } from "@/components/arena/decision-rail";
import { ArenaPath } from "@/components/arena/the-loop";
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
  defensesFor,
  evidenceFor,
  reassessmentsFor,
  risksFor,
} from "@/lib/selectors";
import { readArenaDraft, writeArenaDraft } from "@/lib/drafts";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";
import { useDebate, type ReadinessResponse } from "@/lib/use-debate";
import type {
  Argument,
  Company,
  Contradiction,
  Decision,
  Defense,
  Evidence,
  Risk,
} from "@/lib/types";

export function ArenaView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {(company) => (
        <ArenaShell company={company} initialSnapshot={initialSnapshot} />
      )}
    </RequireCompany>
  );
}

function ArenaShell({
  company,
  initialSnapshot,
}: {
  company: Company;
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const storeDecisions = useArena((state) => state.decisions);
  const storeArgs = useArena((state) => state.argumentList);
  const decisions = storeDecisions.length
    ? storeDecisions
    : Array.isArray(initialSnapshot?.decisions)
      ? (initialSnapshot.decisions as Decision[])
      : [];
  const argumentList = storeArgs.length
    ? storeArgs
    : Array.isArray(initialSnapshot?.argumentList)
      ? (initialSnapshot.argumentList as Argument[])
      : [];
  const activeDecisionId = useArena((state) => state.activeDecisionId);

  const decision = useMemo(() => {
    if (activeDecisionId) {
      const found = decisions.find((d) => d.id === activeDecisionId);
      if (found) return found;
    }
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
  return (
    <Workspace
      decision={decision}
      company={company}
      initialSnapshot={initialSnapshot}
    />
  );
}

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
        <ArenaPath here="decision" />
        <p className="type-eyebrow mt-8">Opening the round</p>
        <h1 className="type-display mt-5 max-w-[22ch] text-[clamp(2rem,4.5vw,3rem)] font-semibold">
          The seats are writing the first arguments.
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
                  <span className="type-eyebrow">{perspective.mark}</span>
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
      <div className="border border-rule">
        <div className="border-b border-rule px-3 py-2">
          <DecisionRail />
        </div>
        <ArenaPath here="decision" framed={false} />
      </div>
      <div className="mt-10 grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
        <div>
          <p className="type-eyebrow">Decision · {company.name}</p>
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
                  scheduleWorkspaceSave();
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
                  scheduleWorkspaceSave();
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

        <aside className="border border-rule bg-leaf px-5 py-5">
          <p className="type-eyebrow">The loop</p>
          <ol className="mt-5 space-y-4 text-[14px] leading-relaxed">
            <li>
              <p className="font-medium text-ink">Company Brain</p>
              <p className="text-graphite">Facts and assumptions already on record.</p>
            </li>
            <li>
              <p className="font-medium text-ink">Founder · Agent</p>
              <p className="text-graphite">
                You defend. An agent writes through WebMCP tools.
              </p>
            </li>
            <li>
              <p className="font-medium text-ink">Shared state</p>
              <p className="text-graphite">
                Risks, contradictions, evidence. Then you commit.
              </p>
            </li>
            <li>
              <p className="font-medium text-ink">Prediction → outcome</p>
              <p className="text-graphite">
                A number that can be wrong. Calibration follows.
              </p>
            </li>
          </ol>
        </aside>
      </div>
    </div>
  );
}

function Workspace({
  decision,
  company,
  initialSnapshot,
}: {
  decision: Decision;
  company: Company;
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const { busy, error, defend, summarise, open: openRound, openingReady } =
    useDebate();

  const storeArgs = useArena(
    useShallow((state) => argumentsFor(state, decision.id)),
  );
  const seededArgs = Array.isArray(initialSnapshot?.argumentList)
    ? (initialSnapshot.argumentList as Argument[]).filter(
        (item) => item.decisionId === decision.id,
      )
    : [];
  const args = storeArgs.length ? storeArgs : seededArgs;
  const storeReassessments = useArena(
    useShallow((state) => reassessmentsFor(state, decision.id)),
  );
  const reassessments = storeReassessments.length
    ? storeReassessments
    : Array.isArray(initialSnapshot?.reassessments)
      ? (initialSnapshot.reassessments as typeof storeReassessments).filter(
          (item) => item.decisionId === decision.id,
        )
      : [];
  const storeRisks = useArena(
    useShallow((state) => risksFor(state, decision.id)),
  );
  const storeEvidence = useArena(
    useShallow((state) => evidenceFor(state, decision.id)),
  );
  const storeCons = useArena(
    useShallow((state) => contradictionsFor(state, decision.id)),
  );
  const risks = storeRisks.length
    ? storeRisks
    : Array.isArray(initialSnapshot?.risks)
      ? (initialSnapshot.risks as Risk[]).filter(
          (item) => item.decisionId === decision.id,
        )
      : [];
  const evidence = storeEvidence.length
    ? storeEvidence
    : Array.isArray(initialSnapshot?.evidence)
      ? (initialSnapshot.evidence as Evidence[]).filter(
          (item) => item.decisionId === decision.id,
        )
      : [];
  const contradictions = storeCons.length
    ? storeCons
    : Array.isArray(initialSnapshot?.contradictions)
      ? (initialSnapshot.contradictions as Contradiction[]).filter(
          (item) => item.decisionId === decision.id,
        )
      : [];
  const actionItems = useArena(
    useShallow((state) => actionItemsFor(state, decision.id)),
  );
  const storeDefenses = useArena(
    useShallow((state) => defensesFor(state, decision.id)),
  );
  const defenses = storeDefenses.length
    ? storeDefenses
    : Array.isArray(initialSnapshot?.defenses)
      ? (initialSnapshot.defenses as Defense[]).filter(
          (item) => item.decisionId === decision.id,
        )
      : [];
  const spotlightId = useArena((state) => state.spotlightId);
  const pendingCommit = useArena((state) => state.pendingCommit);
  const updateDecision = useArena((state) => state.updateDecision);

  const [defense, setDefense] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [summary, setSummary] = useState<ReadinessResponse | null>(null);
  const [floorOpen, setFloorOpen] = useState(() =>
    Array.isArray(initialSnapshot?.defenses)
      ? (initialSnapshot.defenses as Defense[]).some(
          (item) => item.decisionId === decision.id,
        )
      : false,
  );

  const committed = decision.status === "committed";

  useEffect(() => {
    if (pendingCommit?.decisionId === decision.id && !committed) {
      setCommitOpen(true);
    }
  }, [pendingCommit, decision.id, committed]);

  useEffect(() => {
    if (defenses.length > 0 || busy === "defending") {
      setFloorOpen(true);
    }
  }, [defenses.length, busy]);

  async function submitDefense() {
    if (defense.trim().length < 3) return;
    const text = defense.trim();
    setDefense("");
    const targetId = target;
    setTarget(null);
    setFloorOpen(true);
    await defend(decision.id, text, targetId);
  }

  async function openCommit() {
    setCommitOpen(true);
    setSummary(null);
    const result = await summarise(decision.id);
    setSummary(result);
  }

  const commitBar = (
    <div className="flex shrink-0 flex-wrap items-end gap-6 border-t border-rule bg-paper px-4 py-3">
      <div className="min-w-[160px] flex-1">
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
      <div className="min-w-[160px] flex-1">
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
          <Button asChild variant="outline" className="h-10">
            <Link href="/history">Open the record</Link>
          </Button>
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
  );

  if (floorOpen) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-paper">
        <FloorBar
          question={decision.question}
          round={decision.round}
          status={decision.status}
          onLeave={() => setFloorOpen(false)}
        />
        <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-2">
          <FloorTalk
            defenses={defenses}
            reassessments={reassessments}
            value={defense}
            busy={busy === "defending"}
            committed={committed}
            targetLabel={targetSeatLabel(args, target)}
            onChange={setDefense}
            onSubmit={submitDefense}
            onClearTarget={() => setTarget(null)}
          />
          <FloorBoard
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
          <div className="shrink-0 border-t border-rule bg-oxblood-wash px-4 py-2 text-sm text-ink">
            {error.message}
          </div>
        ) : null}
        {commitBar}
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

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 pb-28 lg:py-10 lg:pb-32">
      <header className="border border-rule">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule px-3 py-2">
          <DecisionRail currentId={decision.id} seed={[decision]} />
          <p className="type-eyebrow shrink-0">
            Round {decision.round} · {decision.status}
          </p>
        </div>
        <ArenaPath here={committed ? "commit" : "arena"} framed={false} />
        <div className="border-t border-rule px-5 py-7 sm:px-6">
          <h1 className="type-display max-w-[22em] text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-[1.08] [overflow-wrap:anywhere]">
            {decision.question}
          </h1>
          {decision.options.length ? (
            <ol className="mt-7 grid gap-px bg-rule sm:grid-cols-3">
              {decision.options.map((option, index) => {
                const chosen = decision.chosenOptionId === option.id;
                return (
                  <li
                    key={option.id}
                    className={cn(
                      "min-w-0 px-4 py-4",
                      chosen ? "bg-leaf" : "bg-paper",
                    )}
                  >
                    <span className="type-figure text-[12px] text-pencil">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <p className="mt-2 text-[15px] leading-snug text-ink">
                      {option.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </header>

      <BriefingWrite
        value={defense}
        busy={busy === "defending"}
        onChange={setDefense}
        onSubmit={submitDefense}
      />

      {defenses.length ? (
        <div className="mt-6">
          <Button variant="outline" onClick={() => setFloorOpen(true)}>
            Back to the floor
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 border border-rule bg-oxblood-wash px-4 py-3">
          <p className="text-sm text-ink">{error.message}</p>
          {error.hint ? (
            <p className="mt-1.5 text-[13px] text-graphite">{error.hint}</p>
          ) : null}
        </div>
      ) : null}

      {commitBar}

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
