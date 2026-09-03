"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  FloorBar,
  FloorBoard,
  FloorTalk,
  targetSeatLabel,
} from "@/components/arena/floor";
import { SplitPane } from "@/components/shell/split-pane";
import { isWatchSnapshot, type WatchSnapshot } from "@/lib/watch-snapshot";

function noop() {}

export function SpectatorArena({
  token,
  initialSnapshot = null,
}: {
  token: string;
  initialSnapshot?: WatchSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<WatchSnapshot | null>(
    initialSnapshot,
  );
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let opening = false;

    async function pull() {
      try {
        const response = await fetch(`/api/watch/${token}`);
        if (cancelled) return;
        if (response.status === 404) {
          setMissing(true);
          return;
        }
        const payload = await response.json().catch(() => null);
        if (payload && isWatchSnapshot(payload.snapshot)) {
          opening = payload.snapshot.arenaPhase === "opening";
          setSnapshot(payload.snapshot);
          setMissing(false);
        }
      } catch {
        /* next tick */
      }
      if (cancelled) return;
      timer = window.setTimeout(() => void pull(), opening ? 400 : 800);
    }

    void pull();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [token]);

  if (missing && !snapshot) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center bg-paper px-6">
        <p className="max-w-[42ch] text-center text-[16px] leading-relaxed text-graphite">
          This watch has not started, or it ended. Open the live floor on the
          other laptop and copy Watch again.
        </p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center bg-paper px-6">
        <p className="text-[16px] text-graphite">Waiting for the other laptop…</p>
      </div>
    );
  }

  const decision = snapshot.decision;
  const args = snapshot.arguments;
  const busy = snapshot.arenaPhase === "opening" ? "opening" : null;
  const committed = decision.status === "committed";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-paper">
      <FloorBar
        question={decision.question}
        round={decision.round}
        status={decision.status}
        decisionId={decision.id}
        spectator
        onCopyWatch={() => {
          const href = window.location.href;
          void navigator.clipboard.writeText(href).then(
            () => toast("Watch link copied."),
            () => toast(href),
          );
        }}
        agentInRoom={Boolean(snapshot.agentTool)}
      />
      <SplitPane
        storageKey="arena-floor-watch"
        left={
          <FloorTalk
            defenses={snapshot.defenses}
            reassessments={snapshot.reassessments}
            arguments={args}
            value=""
            busy={Boolean(busy)}
            committed={committed}
            targetLabel={targetSeatLabel(args, null)}
            onChange={noop}
            onSubmit={noop}
            onClearTarget={noop}
            readOnly
          />
        }
        right={
          <FloorBoard
            decision={decision}
            companyName={snapshot.companyName}
            args={args}
            reassessments={snapshot.reassessments}
            risks={snapshot.risks}
            evidence={snapshot.evidence}
            contradictions={snapshot.contradictions}
            actionItems={snapshot.actionItems}
            spotlightId={null}
            busy={busy}
            openingReady={snapshot.openingReady}
            defense=""
            target={null}
            onDefenseChange={noop}
            onTarget={noop}
            onSubmitDefense={noop}
            readOnly
          />
        }
      />
      <p className="shrink-0 border-t border-rule px-4 py-2 text-[13px] text-graphite">
        Spectating {snapshot.companyName || "the floor"}. This tab cannot write.
        {snapshot.commitRefused ? " confirm_commit is waiting for the founder." : ""}
      </p>
    </div>
  );
}
