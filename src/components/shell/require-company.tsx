"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  snapshotIsEmpty,
  useArena,
  type WorkspaceSnapshot,
} from "@/lib/store";
import {
  adoptSnapshotIfRicher,
  pullRemoteWorkspace,
  scheduleWorkspaceSave,
} from "@/lib/supabase/sync";
import type { Company } from "@/lib/types";

/**
 * Every screen after onboarding needs a Company Brain. Rather than redirecting
 * — which flashes and loses the back button — the screen explains what is
 * missing and offers the way in.
 */
export function RequireCompany({
  children,
  initialSnapshot,
}: {
  children: (company: Company) => React.ReactNode;
  initialSnapshot?: Record<string, unknown> | null;
}) {
  const storeCompany = useArena((state) => state.company);
  const snapshotCompany =
    initialSnapshot &&
    typeof initialSnapshot.company === "object" &&
    initialSnapshot.company
      ? (initialSnapshot.company as Company)
      : null;
  const company = storeCompany ?? snapshotCompany;

  useLayoutEffect(() => {
    adoptSnapshotIfRicher(initialSnapshot as WorkspaceSnapshot | null);
  }, [initialSnapshot]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void pullRemoteWorkspace().finally(() => {
      if (cancelled) return;
      unsub = useArena.subscribe(() => scheduleWorkspaceSave());
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  if (!company) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-paper">
        <div className="flex shrink-0 items-center gap-4 border-b border-rule px-4 py-2.5">
          <p className="type-eyebrow text-graphite">Arena</p>
          <p className="type-display min-w-0 flex-1 truncate text-[17px] font-semibold">
            No Company Brain yet
          </p>
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-2">
          <div className="flex min-h-0 min-w-0 flex-col border-r border-rule bg-paper">
            <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-2">
              <p className="type-eyebrow text-indigo">You</p>
              <p className="text-[13px] text-graphite">
                The board has nothing to argue from yet.
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <p className="text-[15px] leading-relaxed text-graphite">
                Arguments that are not grounded in your product, your repository
                and your history are just startup advice.
              </p>
            </div>
            <div className="shrink-0 border-t border-rule bg-paper px-4 py-3">
              <Button asChild className="h-8 rounded-none px-3.5 text-[13px]">
                <Link href="/onboarding?existing=1">Build your Company Brain</Link>
              </Button>
            </div>
          </div>
          <div className="hidden min-h-0 min-w-0 flex-col bg-leaf md:flex">
            <header className="shrink-0 border-b border-rule bg-paper px-5 py-3">
              <p className="type-eyebrow">The board</p>
              <p className="mt-1 text-[13.5px] text-graphite">
                Give it a website and a GitHub repository, and it will have
                something to argue with.
              </p>
            </header>
            <div className="min-h-0 flex-1 px-5 py-5">
              <p className="text-[14px] leading-relaxed text-graphite">
                No open risk. No open contradiction. No outstanding evidence.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(company)}</>;
}

export function HydrateWorkspace({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  useLayoutEffect(() => {
    if (
      initialSnapshot &&
      !snapshotIsEmpty(initialSnapshot as WorkspaceSnapshot)
    ) {
      adoptSnapshotIfRicher(initialSnapshot as WorkspaceSnapshot);
    }
  }, [initialSnapshot]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void pullRemoteWorkspace().finally(() => {
      if (cancelled) return;
      unsub = useArena.subscribe(() => scheduleWorkspaceSave());
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);
  return null;
}
