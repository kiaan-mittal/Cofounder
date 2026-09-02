"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError, post } from "@/lib/api";
import { briefFromState } from "@/lib/decision-brief";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ExportDestination = "link" | "slack" | "notion";

const LOGOS = {
  slack: "https://logos.composio.dev/api/slack",
  notion: "https://logos.composio.dev/api/notion",
} as const;

function AppLogo({
  toolkit,
  className,
}: {
  toolkit: "slack" | "notion";
  className?: string;
}) {
  return (
    <img
      src={LOGOS[toolkit]}
      alt=""
      width={16}
      height={16}
      className={cn("size-4", className)}
    />
  );
}

function toastError(error: unknown) {
  if (error instanceof ApiError) {
    toast(error.message, { description: error.hint });
    return;
  }
  toast(error instanceof Error ? error.message : "Export failed.");
}

export function ExportDecision({
  decisionId,
  returnTo = "/arena",
  compact = false,
  variant = "row",
}: {
  decisionId: string;
  returnTo?: string;
  compact?: boolean;
  variant?: "row" | "menu";
}) {
  const [busy, setBusy] = useState<ExportDestination | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolkit = params.get("export");
    const ok = params.get("export_ok");
    if (toolkit === "slack" || toolkit === "notion") {
      if (ok === "1") {
        toast(
          toolkit === "slack" ? "Slack is connected." : "Notion is connected.",
          { description: "Send the decision again." },
        );
        setConnected((current) =>
          current.includes(toolkit) ? current : [...current, toolkit],
        );
      } else if (ok === "0") {
        toast("Could not finish connecting. Try again.");
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("export");
      url.searchParams.delete("export_ok");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/export/status")
      .then((response) => response.json())
      .then((payload: { connected?: string[] }) => {
        if (!cancelled && Array.isArray(payload.connected)) {
          setConnected(payload.connected);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(destination: ExportDestination) {
    const brief = briefFromState(useArena.getState(), decisionId);
    if (!brief) {
      toast("Nothing to export yet.");
      return;
    }
    setBusy(destination);
    try {
      const result = await post<{
        url: string;
        needsConnect?: boolean;
        connectUrl?: string;
        error?: string;
      }>("/api/export", {
        destination,
        brief,
        decisionId,
        returnTo,
      });
      setLastUrl(result.url);
      if (destination === "link") {
        await navigator.clipboard.writeText(result.url).catch(() => undefined);
        toast("Link copied.", { description: result.url });
        return;
      }
      if (result.needsConnect && result.connectUrl) {
        window.location.href = result.connectUrl;
        return;
      }
      toast(
        destination === "slack" ? "Sent to Slack." : "Written to Notion.",
        { description: result.url },
      );
      if (!connected.includes(destination)) {
        setConnected((current) => [...current, destination]);
      }
    } catch (error) {
      toastError(error);
    } finally {
      setBusy(null);
    }
  }

  const slackLabel = connected.includes("slack") ? "Send to Slack" : "Connect Slack";
  const notionLabel = connected.includes("notion")
    ? "Send to Notion"
    : "Connect Notion";

  if (variant === "menu") {
    const item =
      "flex h-9 w-full items-center gap-2 px-3 text-left text-[13px] text-ink hover:bg-tape disabled:opacity-50";
    return (
      <div className="flex flex-col border-t border-rule">
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null}
          onClick={() => void send("link")}
          className={item}
        >
          {busy === "link" ? "Copying…" : "Copy share link"}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null}
          onClick={() => void send("slack")}
          className={item}
        >
          <AppLogo toolkit="slack" />
          {busy === "slack" ? "Sending…" : slackLabel}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null}
          onClick={() => void send("notion")}
          className={item}
        >
          <AppLogo toolkit="notion" />
          {busy === "notion" ? "Writing…" : notionLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "flex-nowrap" : "flex-wrap",
      )}
    >
      <Button
        type="button"
        variant="outline"
        className={compact ? "h-8 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]"}
        disabled={busy !== null}
        onClick={() => void send("link")}
      >
        {busy === "link" ? "Copying…" : compact ? "Share" : "Copy link"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={compact ? "h-8 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]"}
        disabled={busy !== null}
        onClick={() => void send("slack")}
      >
        <AppLogo toolkit="slack" />
        {busy === "slack" ? "Sending…" : slackLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={compact ? "h-8 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]"}
        disabled={busy !== null}
        onClick={() => void send("notion")}
      >
        <AppLogo toolkit="notion" />
        {busy === "notion" ? "Writing…" : notionLabel}
      </Button>
      {lastUrl && !compact ? (
        <a
          href={lastUrl}
          target="_blank"
          rel="noreferrer"
          className="type-eyebrow text-ink underline underline-offset-4"
        >
          Open share
        </a>
      ) : null}
    </div>
  );
}
