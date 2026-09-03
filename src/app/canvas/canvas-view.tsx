"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { DecisionCanvas } from "@/components/arena/decision-canvas";
import { DecisionRail } from "@/components/arena/decision-rail";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { landRoundOnCanvas } from "@/lib/canvas-model";
import {
  argumentsFor,
  contradictionsFor,
  evidenceFor,
  risksFor,
} from "@/lib/selectors";
import { useArena } from "@/lib/store";
import type { Argument, Company, Decision } from "@/lib/types";

export function CanvasView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {(company) => (
        <CanvasWorkspace company={company} initialSnapshot={initialSnapshot} />
      )}
    </RequireCompany>
  );
}

function CanvasWorkspace({
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
  const router = useRouter();

  const decision = useMemo(() => {
    if (activeDecisionId) {
      const found = decisions.find((item) => item.id === activeDecisionId);
      if (found) return found;
    }
    const argued = new Set(argumentList.map((item) => item.decisionId));
    return (
      decisions.find(
        (item) =>
          (item.status === "open" || item.status === "investigating") &&
          argued.has(item.id),
      ) ??
      decisions[0] ??
      null
    );
  }, [decisions, activeDecisionId, argumentList]);

  const writeId = decision?.id ?? company.id;
  const storeArgsFor = useArena(
    useShallow((state) => (decision ? argumentsFor(state, decision.id) : [])),
  );
  const args = storeArgsFor.length
    ? storeArgsFor
    : argumentList.filter((item) => item.decisionId === writeId);
  const risks = useArena(
    useShallow((state) => (decision ? risksFor(state, decision.id) : [])),
  );
  const evidence = useArena(
    useShallow((state) => (decision ? evidenceFor(state, decision.id) : [])),
  );
  const contradictions = useArena(
    useShallow((state) =>
      decision ? contradictionsFor(state, decision.id) : [],
    ),
  );

  useEffect(() => {
    if (!decision) return;
    const store = useArena.getState();
    const existing = (store.canvasNodes ?? []).filter(
      (node) => node.decisionId === decision.id,
    );
    const landed = landRoundOnCanvas({
      decisionId: decision.id,
      existing,
      arguments: args,
      risks,
      evidence,
      contradictions,
    });
    if (landed.nodes.length) store.addCanvasNodes(landed.nodes);
    if (landed.links.length) store.addCanvasLinks(landed.links);
  }, [decision, args, risks, evidence, contradictions]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 lg:py-14">
      <DecisionRail
        currentId={decision?.id}
        onNew={() => router.push("/arena")}
      />

      <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[52ch]">
          <p className="type-eyebrow">Canvas</p>
          <h1 className="type-display mt-3 text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-[1.08]">
            {decision?.question ?? company.name}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-graphite">
            The map of this decision. The floor is the loop. This is the
            drawing.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10">
          <Link href="/arena">Open the floor</Link>
        </Button>
      </header>

      <div className="mt-8">
        <DecisionCanvas
          boardIds={decision ? [decision.id, company.id] : [company.id]}
          writeId={writeId}
          title={decision?.question ?? company.name}
          confidence={decision?.agentConfidence ?? null}
        />
      </div>
    </div>
  );
}
