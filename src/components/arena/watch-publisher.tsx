"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError, post, put } from "@/lib/api";
import { useArena } from "@/lib/store";
import {
  clearWatchSession,
  readWatchSession,
  watchPageUrl,
  writeWatchSession,
} from "@/lib/watch-session";
import {
  watchFingerprint,
  watchSnapshotFromStore,
} from "@/lib/watch-live";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let publishing = false;
let queued = false;

async function publishWatch(lastFingerprint: { current: string }) {
  if (publishing) {
    queued = true;
    const session = readWatchSession();
    return session ? watchPageUrl(session.token) : null;
  }
  publishing = true;
  try {
    let url: string | null = null;
    do {
      queued = false;
      url = await publishWatchOnce(lastFingerprint);
    } while (queued);
    return url;
  } finally {
    publishing = false;
  }
}

async function publishWatchOnce(lastFingerprint: { current: string }) {
  const state = useArena.getState();
  const fingerprint = watchFingerprint(state);
  if (!fingerprint) {
    const session = readWatchSession();
    return session ? watchPageUrl(session.token) : null;
  }
  if (fingerprint === lastFingerprint.current) {
    const session = readWatchSession();
    return session ? watchPageUrl(session.token) : null;
  }
  const snapshot = watchSnapshotFromStore(state);
  if (!snapshot) return null;
  lastFingerprint.current = fingerprint;

  const existing = readWatchSession();
  try {
    if (existing) {
      try {
        await put(`/api/watch/${existing.token}`, {
          writeKey: existing.writeKey,
          snapshot,
        });
        return watchPageUrl(existing.token);
      } catch (error) {
        const gone =
          error instanceof ApiError &&
          /not started|ended|not valid/i.test(error.message);
        if (!gone) throw error;
        clearWatchSession();
      }
    }
    const created = await post<{
      token: string;
      writeKey: string;
      url: string;
    }>("/api/watch", { snapshot });
    writeWatchSession(created.token, created.writeKey);
    return created.url;
  } catch {
    lastFingerprint.current = "";
    return null;
  }
}

/**
 * Publishes the live floor to a capability URL a second laptop can open.
 * The write key never leaves this tab.
 */
export function WatchPublisher({
  compact = true,
  variant = "button",
}: {
  compact?: boolean;
  variant?: "button" | "menu" | "sync";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastFingerprint = useRef("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const session = readWatchSession();
    if (session) setUrl(watchPageUrl(session.token));

    async function publish() {
      const next = await publishWatch(lastFingerprint);
      if (next) setUrl(next);
    }

    function schedule() {
      const opening = useArena.getState().arenaPhase === "opening";
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void publish();
      }, opening ? 250 : 400);
    }

    void publish();
    const unsub = useArena.subscribe(() => schedule());
    const kick = window.setTimeout(() => void publish(), 600);
    return () => {
      unsub();
      if (timer.current !== null) window.clearTimeout(timer.current);
      window.clearTimeout(kick);
    };
  }, []);

  async function copy() {
    setBusy(true);
    try {
      const next = (await publishWatch(lastFingerprint)) ?? url;
      if (!next) {
        toast("The watch link is not ready yet.");
        return;
      }
      setUrl(next);
      await navigator.clipboard.writeText(next);
      toast("Watch link copied.", {
        description: "Open it on another laptop. That tab cannot write.",
      });
    } catch {
      toast("Copy the URL from the address bar.", {
        description: url ?? undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  if (variant === "sync") return null;

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        onClick={() => void copy()}
        className="flex h-9 w-full items-center px-3 text-left text-[13px] text-ink hover:bg-tape disabled:opacity-50"
      >
        {busy ? "Copying…" : "Copy watch link"}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(compact ? "h-8 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]")}
      disabled={busy}
      onClick={() => void copy()}
    >
      {busy ? "Copying…" : "Watch"}
    </Button>
  );
}
