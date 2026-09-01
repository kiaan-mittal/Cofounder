"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { ArenaCallDock } from "@/components/arena/arena-verdict";
import { CommitFlow } from "@/components/arena/commit-flow";
import {
  FloorBar,
  FloorBoard,
  FloorTalk,
  targetSeatLabel,
} from "@/components/arena/floor";
import { DecisionGallery, DecisionRail } from "@/components/arena/decision-rail";
import { SharedState } from "@/components/arena/the-loop";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { TableSketch } from "@/components/ink/table-drawings";
import { RequireCompany } from "@/components/shell/require-company";
import { SplitPane } from "@/components/shell/split-pane";
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
import { detectPatterns } from "@/lib/calibration";
import { readArenaDraft, writeArenaDraft } from "@/lib/drafts";
import { snapshotIsEmpty, useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { useDebate, type ReadinessResponse } from "@/lib/use-debate";
import { founderCall } from "@/webmcp/run";
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
  const storeActive = useArena((state) => state.activeDecisionId);
  const listingArenas = useArena((state) => state.listingArenas);
  const decisions = storeDecisions.length
    ? storeDecisions
    : Array.isArray(initialSnapshot?.decisions)
      ? (initialSnapshot.decisions as Decision[])
      : [];
  const snapshotActive =
    typeof initialSnapshot?.activeDecisionId === "string"
      ? initialSnapshot.activeDecisionId
      : null;
  const activeDecisionId = listingArenas
    ? null
    : storeDecisions.length
      ? storeActive
      : (snapshotActive ??
        (decisions.length === 1 ? decisions[0].id : null));

  useLayoutEffect(() => {
    if (!initialSnapshot || snapshotIsEmpty(initialSnapshot)) return;
    const local = useArena.getState();
    const remoteDecisions = Array.isArray(initialSnapshot.decisions)
      ? initialSnapshot.decisions
      : [];
    if (local.decisions.length === 0 && remoteDecisions.length > 0) {
      local.importWorkspace(initialSnapshot);
    }
  }, [initialSnapshot]);

  const decision = useMemo(() => {
    if (!activeDecisionId) return null;
    return decisions.find((item) => item.id === activeDecisionId) ?? null;
  }, [decisions, activeDecisionId]);

  if (!decision) {
    return (
      <DecisionStart
        company={company}
        seed={decisions}
      />
    );
  }
  return (
    <Workspace
      decision={decision}
      company={company}
      initialSnapshot={initialSnapshot}
      seed={decisions}
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

function DecisionStart({
  company,
  seed = [],
}: {
  company: Company;
  seed?: Decision[];
}) {
  const { busy, error, open, openingReady } = useDebate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(
    () => queryQuestion(searchParams) || readArenaDraft().question,
  );
  const [context, setContext] = useState(() => {
    const fromQuery = queryQuestion(searchParams);
    const fromContext = queryContext(searchParams);
    return fromQuery ? fromContext : readArenaDraft().context;
  });
  const [composerKey, setComposerKey] = useState(0);
  const storeDecisions = useArena((state) => state.decisions);
  const decisions = storeDecisions.length ? storeDecisions : seed;
  const composeNonce = useArena((state) => state.composeNonce ?? 0);
  const seenNonce = useRef(composeNonce);

  useEffect(() => {
    if (composeNonce === seenNonce.current) return;
    seenNonce.current = composeNonce;
    writeArenaDraft({ question: "", context: "" });
    setQuestion("");
    setContext("");
    setComposerKey((key) => key + 1);
    if (queryQuestion(searchParams) || queryContext(searchParams)) {
      router.replace("/arena", { scroll: false });
    }
  }, [composeNonce, router, searchParams]);

  useEffect(() => {
    if (composerKey === 0) return;
    document.getElementById("question")?.focus();
  }, [composerKey]);

  useEffect(() => {
    const fromQuery = queryQuestion(searchParams);
    const fromContext = queryContext(searchParams);
    if (!fromQuery) return;
    setQuestion(fromQuery);
    setContext(fromContext);
    writeArenaDraft({ question: fromQuery, context: fromContext });
  }, [searchParams]);

  async function start(event?: React.FormEvent) {
    event?.preventDefault();
    if (question.trim().length < 8) return;
    await open(question.trim(), context.trim());
  }

  function submitOnMetaEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void start();
    }
  }

  const writing = PERSPECTIVES.map((item) => item.id).filter(
    (id) => !openingReady.includes(id),
  );
  const ready = openingReady;

  if (busy === "opening") {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-paper">
        <div className="flex shrink-0 items-center gap-4 border-b border-rule px-4 py-2.5">
          <p className="type-eyebrow text-graphite">Opening the round</p>
          <p className="type-display min-w-0 flex-1 truncate text-[17px] font-semibold">
            {question}
          </p>
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-2">
          <div className="flex min-h-0 min-w-0 flex-col border-r border-rule bg-paper">
            <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-2">
              <p className="type-eyebrow text-indigo">You</p>
              <p className="min-w-0 truncate text-[13px] text-graphite">
                They read the Brain, then place cards.
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <p className="type-eyebrow animate-pulse text-oxblood">
                The seats are writing the first arguments.
              </p>
              <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink">
                {question}
              </p>
              {context ? (
                <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-graphite">
                  {context}
                </p>
              ) : null}
            </div>
          </div>
          <div className="hidden min-h-0 min-w-0 flex-col bg-leaf md:flex">
            <header className="shrink-0 border-b border-rule bg-paper px-5 py-3">
              <p className="type-eyebrow">The board</p>
              <p className="mt-1 text-[13.5px] text-graphite">
                Technical, Product, GTM, Financial, Contrarian. Cards move when
                they speak.
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-rule px-4 py-4">
                <TableSketch writing={writing} ready={ready} filled={[]} />
                <ul className="mt-2 flex justify-between px-2">
                  {PERSPECTIVES.map((perspective) => {
                    const seatReady = ready.includes(perspective.id);
                    return (
                      <li
                        key={perspective.id}
                        className="flex flex-col items-center gap-1"
                      >
                        <PerspectiveEmblem
                          perspective={perspective.id}
                          className="size-12"
                        />
                        <span className="type-eyebrow">{perspective.mark}</span>
                        <span
                          className={
                            seatReady
                              ? "type-eyebrow text-moss"
                              : "type-eyebrow animate-pulse"
                          }
                        >
                          {seatReady ? "ready" : "writing"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <SharedState
                risks={[]}
                contradictions={[]}
                evidence={[]}
                stacked
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-paper">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-rule px-3">
        <DecisionRail seed={decisions} />
        <p className="type-eyebrow hidden shrink-0 sm:block">
          {company.name}
        </p>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-paper">
        <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-2">
          <p className="type-eyebrow text-indigo">You</p>
          <p className="min-w-0 truncate text-[13px] text-graphite">
            The board waits until you name the decision.
          </p>
        </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {decisions.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-graphite">
                A question with more than one honest answer. The seats will
                write first.
              </p>
            ) : (
              <DecisionGallery
                decisions={decisions}
                onOpen={(id) => {
                  useArena.getState().setActiveDecision(id);
                  scheduleWorkspaceSave();
                  void founderCall("open_saved_decision", { decision_id: id });
                }}
              />
            )}
          </div>
          <form
            onSubmit={start}
            action="#"
            className="shrink-0 border-t border-rule bg-paper px-4 py-2.5"
          >
            <label htmlFor="question" className="sr-only">
              The decision
            </label>
            <div
              className={
                composerKey > 0
                  ? "border border-indigo bg-paper"
                  : "border border-indigo/35 bg-paper"
              }
            >
              <Textarea
                key={composerKey}
                id="question"
                name="question"
                value={question}
                rows={3}
                placeholder="Should /research run without a Clerk session?"
                className="[field-sizing:fixed] min-h-[72px] w-full bg-paper px-3 py-2 text-[16px] leading-snug caret-indigo shadow-none"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuestion(value);
                  writeArenaDraft({ question: value, context });
                  scheduleWorkspaceSave();
                }}
                onKeyDown={submitOnMetaEnter}
              />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div className="min-w-0 flex-1 border border-rule bg-paper">
                <label htmlFor="context" className="sr-only">
                  What the sources cannot see
                </label>
                <Textarea
                  key={`context-${composerKey}`}
                  id="context"
                  name="context"
                  value={context}
                  rows={2}
                  placeholder="The queue already gates Slack and X. (optional)"
                  className="[field-sizing:fixed] min-h-[44px] w-full bg-paper px-3 py-2 text-[14px] leading-snug shadow-none"
                  onChange={(event) => {
                    const value = event.target.value;
                    setContext(value);
                    writeArenaDraft({ question, context: value });
                    scheduleWorkspaceSave();
                  }}
                  onKeyDown={submitOnMetaEnter}
                />
              </div>
              <button
                type="submit"
                disabled={question.trim().length < 8}
                className="type-eyebrow mb-1.5 h-8 shrink-0 bg-ink px-3.5 text-paper transition-opacity disabled:opacity-40"
              >
                Open the round
              </button>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-graphite">
              Or don&rsquo;t type. In ChatGPT: “Use Decision Arena to
              stress-test whether I should …” The seats write on this board.
            </p>
            {error ? (
              <div className="mt-2 border border-rule bg-oxblood-wash px-3 py-2">
                <p className="text-sm text-ink">{error.message}</p>
                {error.hint ? (
                  <p className="mt-1 text-[13px] text-graphite">{error.hint}</p>
                ) : null}
              </div>
            ) : null}
          </form>
      </div>
    </div>
  );
}

function Workspace({
  decision,
  company,
  initialSnapshot,
  seed = [],
}: {
  decision: Decision;
  company: Company;
  initialSnapshot?: Record<string, unknown> | null;
  seed?: Decision[];
}) {
  const { busy: hookBusy, error, defend, summarise, open: openRound } =
    useDebate();
  const arenaPhase = useArena((state) => state.arenaPhase);
  const openingReady = useArena((state) => state.openingReady);
  const busy = arenaPhase === "opening" ? "opening" : hookBusy;

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

  const [defense, setDefense] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [summary, setSummary] = useState<ReadinessResponse | null>(null);

  const committed = decision.status === "committed";

  useEffect(() => {
    const state = useArena.getState();
    if (!state.company) return;
    state.setPatterns(
      detectPatterns(state.company.id, state.predictions, state.decisions),
    );
  }, [decision.id]);

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

  async function openWeighUp() {
    setCommitOpen(true);
    setSummary(null);
    const result = await summarise(decision.id);
    setSummary(result);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-paper">
      <FloorBar
        question={decision.question}
        round={decision.round}
        status={decision.status}
        decisionId={decision.id}
        seed={seed}
      />
      <SplitPane
        storageKey="arena-floor"
        left={
          <FloorTalk
            defenses={defenses}
            reassessments={reassessments}
            arguments={args}
            value={defense}
            busy={busy === "defending" || busy === "opening"}
            committed={committed}
            targetLabel={targetSeatLabel(args, target)}
            onChange={setDefense}
            onSubmit={submitDefense}
            onClearTarget={() => setTarget(null)}
          />
        }
        right={
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
        }
      />
      {error ? (
        <div className="shrink-0 border-t border-rule bg-oxblood-wash px-4 py-2 text-sm text-ink">
          {error.message}
        </div>
      ) : null}
      <ArenaCallDock
        decision={decision}
        committed={committed}
        weighDisabled={busy !== null || args.length === 0}
        onCommit={() => void openWeighUp()}
        arguments={args}
        risks={risks}
        evidence={evidence}
        contradictions={contradictions}
        reassessments={reassessments}
      />
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
