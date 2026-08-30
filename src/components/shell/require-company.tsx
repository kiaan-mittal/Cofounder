"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  snapshotIsEmpty,
  useArena,
  type WorkspaceSnapshot,
} from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
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

  useEffect(() => {
    if (
      initialSnapshot &&
      !snapshotIsEmpty(initialSnapshot as WorkspaceSnapshot) &&
      snapshotIsEmpty(useArena.getState())
    ) {
      useArena.getState().importWorkspace(initialSnapshot as WorkspaceSnapshot);
    }

    void fetch("/api/workspace", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((remote) => {
        const snapshot = remote?.workspace?.snapshot as
          | WorkspaceSnapshot
          | undefined;
        if (snapshot && !snapshotIsEmpty(snapshot)) {
          useArena.getState().importWorkspace(snapshot);
        }
      })
      .catch(() => undefined);

    return useArena.subscribe(() => scheduleWorkspaceSave());
  }, [initialSnapshot]);

  if (!company) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-20">
        <div className="max-w-[46ch]">
          <p className="type-eyebrow">No Company Brain yet</p>
          <h1 className="type-display mt-5 text-[clamp(2rem,4vw,2.75rem)] font-semibold">
            The Arena needs to know your company first.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-graphite">
            Arguments that are not grounded in your product, your repository and
            your history are just startup advice. Give it a website and a
            repository, and it will have something to argue with.
          </p>
          <Button asChild size="lg" className="mt-8 h-11 px-6 text-[15px]">
            <Link href="/onboarding">Build your Company Brain</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children(company)}</>;
}
