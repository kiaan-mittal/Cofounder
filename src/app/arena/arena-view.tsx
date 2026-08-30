"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { AgentConsole } from "@/components/arena/agent-console";
import { CanvasSummary } from "@/components/arena/canvas-summary";
import { CommitFlow } from "@/components/arena/commit-flow";
import { DecisionCanvas } from "@/components/arena/decision-canvas";
import { CanvasTurn } from "@/components/arena/canvas-turn";
import { DecisionGallery, DecisionRail } from "@/components/arena/decision-rail";
import { DecisionTimeline } from "@/components/arena/decision-timeline";
import { PerspectiveEmblem } from "@/components/ink/emblems";
import { TableSketch } from "@/components/ink/table-drawings";
import { HatchMeter } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PERSPECTIVES } from "@/lib/perspectives";
import { argumentsFor, contradictionsFor } from "@/lib/selectors";
import {
  CANVAS_ROOT,
  landRoundOnCanvas,
  makeCanvasLink,
  makeCanvasNode,
  nextClaimSeat,
} from "@/lib/canvas-model";
import { readArenaDraft, writeArenaDraft } from "@/lib/drafts";
import { useArena } from "@/lib/store";
import { useDebate, type ReadinessResponse } from "@/lib/use-debate";
import type { CanvasNode, Company, Decision } from "@/lib/types";
import { runSparringAgent } from "@/webmcp/agent";

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
  const canvasNodes = useArena(
    useShallow((state) =>
      (state.canvasNodes ?? []).filter((node) => node.decisionId === company.id),
    ),
  );

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
          They read the Company Brain, your record, and then write onto the
          same table you have been using.
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
    <div className="mx-auto max-w-[1400px] px-5 py-6 lg:py-8">
      <DecisionRail />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">The Arena · {company.name}</p>
          <h1 className="type-display mt-2 text-[clamp(1.6rem,3.4vw,2.2rem)] font-semibold leading-[1.08]">
            Build the decision on the canvas.
          </h1>
        </div>
        <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-graphite">
          Five objects only. You write in indigo. They write in red. Same map.
        </p>
      </div>

      <div className="mt-5">
        <DecisionTimeline
          current={null}
          history={decisions}
          predictions={[]}
        />
      </div>

      <div className="mt-4">
        <DecisionCanvas
          boardIds={[company.id]}
          writeId={company.id}
          title={question}
          confidence={null}
          onTitleChange={(value) => {
            setQuestion(value);
            writeArenaDraft({ question: value, context });
          }}
        />
      </div>

      <div className="mt-4">
        <CanvasSummary nodes={canvasNodes} contradictions={[]} />
      </div>

      <form id="open-round" onSubmit={start} action="#" className="mt-4">
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
            rows={2}
          />
        </Field>
        <input type="hidden" name="question" value={question} />
        {error ? (
          <div className="mt-4 border border-rule bg-oxblood-wash px-4 py-3">
            <p className="text-sm text-ink">{error.message}</p>
            {error.hint ? (
              <p className="mt-1.5 text-[13px] text-graphite">{error.hint}</p>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          form="open-round"
          size="lg"
          disabled={question.trim().length < 8}
          className="h-11 px-6 text-[15px]"
        >
          Open the round
        </Button>
        <p className="text-[13.5px] text-graphite">
          Drop a claim. Hand work across. Then open the round and they write on
          the same map.
        </p>
      </div>

      {decisions.length ? (
        <div className="mt-14 border-t border-rule pt-8">
          <DecisionGallery
            decisions={decisions}
            onOpen={setActiveDecision}
          />
        </div>
      ) : null}
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
  const contradictions = useArena(
    useShallow((state) => contradictionsFor(state, decision.id)),
  );
  const pendingCommit = useArena((state) => state.pendingCommit);
  const handoff = useArena((state) => state.handoff);
  const updateDecision = useArena((state) => state.updateDecision);
  const canvasNodes = useArena(
    useShallow((state) =>
      (state.canvasNodes ?? []).filter((node) => node.decisionId === decision.id),
    ),
  );
  const predictions = useArena(
    useShallow((state) =>
      state.predictions.filter((item) => item.decisionId === decision.id),
    ),
  );
  const decisions = useArena((state) => state.decisions);

  const [defense, setDefense] = useState("");
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

  useEffect(() => {
    const store = useArena.getState();
    const existing = (store.canvasNodes ?? []).filter(
      (node) => node.decisionId === decision.id,
    );
    if (args.length === 0) return;
    const landed = landRoundOnCanvas({
      decisionId: decision.id,
      existing,
      arguments: args,
      risks: store.risks.filter((risk) => risk.decisionId === decision.id),
      evidence: store.evidence.filter((item) => item.decisionId === decision.id),
      contradictions: store.contradictions.filter(
        (item) => item.decisionId === decision.id,
      ),
    });
    store.addCanvasNodes(landed.nodes);
    store.addCanvasLinks(landed.links);
  }, [decision.id, args]);

  async function submitDefense() {
    if (defense.trim().length < 3) return;
    const text = defense.trim();
    setDefense("");
    const store = useArena.getState();
    const existing = (store.canvasNodes ?? []).filter(
      (node) => node.decisionId === decision.id,
    );
    const seat = nextClaimSeat(existing);
    const node = makeCanvasNode({
      decisionId: decision.id,
      kind: "claim",
      text,
      x: seat.x,
      y: seat.y,
      author: "founder",
      stance: "+",
      seat: "You",
    });
    store.addCanvasNode(node);
    store.addCanvasLink(
      makeCanvasLink({
        decisionId: decision.id,
        fromId: CANVAS_ROOT,
        toId: node.id,
        kind: "supports",
        author: "founder",
      }),
    );
    store.spotlight(node.id);
    store.setHandoff({
      nodeId: node.id,
      instruction: text,
      status: "working",
    });
    try {
      await runSparringAgent({
        goal: `The founder just wrote this claim onto the canvas: "${text}" (id ${node.id}). Read get_canvas first. Then add_canvas_node as a challenge, risk, or evidence, and connect_nodes to that claim. They must see your work appear on the same map. Do not only talk — write on the canvas.`,
        onStep: () => undefined,
      });
    } catch {
      await defend(decision.id, text, null);
    } finally {
      const current = useArena.getState().handoff;
      if (current?.status === "working") {
        useArena.getState().setHandoff({
          ...current,
          status: "returned",
        });
      }
      setTimeout(() => useArena.getState().spotlight(null), 4000);
    }
  }

  async function handOff(node: CanvasNode) {
    const store = useArena.getState();
    store.setHandoff({
      nodeId: node.id,
      instruction: node.text,
      status: "working",
    });
    try {
      await runSparringAgent({
        goal: `The founder handed you this ${node.kind}: "${node.text}" (id ${node.id}). Read get_canvas first. Stress-test it. Then return_work as a new evidence, risk, or claim linked to that node. They should see your work appear on the canvas.`,
        onStep: () => undefined,
      });
    } catch {
      /* Agent console still shows tool traffic. */
    } finally {
      const current = useArena.getState().handoff;
      if (current?.status === "working") {
        useArena.getState().setHandoff({ ...current, status: "returned" });
      }
    }
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

      <div className="mt-6">
        <DecisionTimeline
          current={decision}
          history={decisions}
          predictions={predictions}
        />
      </div>

      <div className="mt-4">
        <DecisionCanvas
          boardIds={[decision.id, company.id]}
          writeId={decision.id}
          title={decision.question}
          confidence={decision.agentConfidence}
          onHandoff={(node) => void handOff(node)}
        />
      </div>

      {!committed ? (
        <div className="mt-4">
          <CanvasTurn
            value={defense}
            busy={handoff?.status === "working"}
            onChange={setDefense}
            onSubmit={() => void submitDefense()}
          />
        </div>
      ) : null}

      {args.length === 0 && !committed ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void openRound(decision.question, decision.context, decision.id)
            }
          >
            {busy === "opening" ? "Writing…" : "Let them write"}
          </Button>
          {busy === "opening" && openingReady.length ? (
            <p className="type-eyebrow">
              {openingReady.length} of {PERSPECTIVES.length} seats
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <CanvasSummary nodes={canvasNodes} contradictions={contradictions} />
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
