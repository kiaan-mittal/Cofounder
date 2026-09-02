"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError, post } from "@/lib/api";
import { briefFromState } from "@/lib/decision-brief";
import { useArena } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  variant?: "row" | "menu" | "logos";
}) {
  const [busy, setBusy] = useState<ExportDestination | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [composio, setComposio] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [statusReady, setStatusReady] = useState(false);

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
      .then(
        (payload: {
          connected?: string[];
          composio?: boolean;
          signedIn?: boolean;
        }) => {
          if (cancelled) return;
          if (Array.isArray(payload.connected)) setConnected(payload.connected);
          if (typeof payload.composio === "boolean") setComposio(payload.composio);
          if (typeof payload.signedIn === "boolean") setSignedIn(payload.signedIn);
          setStatusReady(true);
        },
      )
      .catch(() => {
        if (!cancelled) setStatusReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = `/login?${new URLSearchParams({ returnTo }).toString()}`;
  const canSendApps = composio;

  async function send(destination: ExportDestination) {
    if (destination !== "link" && !canSendApps) {
      toast("Sign in to send this decision.", {
        description: "Slack and Notion need a connected account.",
      });
      window.location.href = loginHref;
      return;
    }

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

  function appTitle(toolkit: "slack" | "notion") {
    if (!canSendApps) return "Sign in to send";
    if (busy === toolkit) {
      return toolkit === "slack" ? "Sending…" : "Writing…";
    }
    if (connected.includes(toolkit)) {
      return toolkit === "slack" ? "Send to Slack" : "Send to Notion";
    }
    return toolkit === "slack" ? "Connect Slack" : "Connect Notion";
  }

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
          disabled={busy !== null || !statusReady}
          onClick={() => void send("slack")}
          className={item}
        >
          <AppLogo toolkit="slack" />
          {appTitle("slack")}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null || !statusReady}
          onClick={() => void send("notion")}
          className={item}
        >
          <AppLogo toolkit="notion" />
          {appTitle("notion")}
        </button>
      </div>
    );
  }

  if (variant === "logos") {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center">
          <AppSendButton
            toolkit="slack"
            label={appTitle("slack")}
            busy={busy !== null || !statusReady}
            quiet
            onClick={() => void send("slack")}
          />
          <AppSendButton
            toolkit="notion"
            label={appTitle("notion")}
            busy={busy !== null || !statusReady}
            quiet
            onClick={() => void send("notion")}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
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
        <AppSendButton
          toolkit="slack"
          label={appTitle("slack")}
          busy={busy !== null || !statusReady}
          onClick={() => void send("slack")}
        />
        <AppSendButton
          toolkit="notion"
          label={appTitle("notion")}
          busy={busy !== null || !statusReady}
          onClick={() => void send("notion")}
        />
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
        {!signedIn && !compact && !canSendApps ? (
          <a
            href={loginHref}
            className="type-eyebrow text-graphite underline underline-offset-4 hover:text-ink"
          >
            Sign in to send
          </a>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function AppSendButton({
  toolkit,
  label,
  busy,
  onClick,
  quiet = false,
}: {
  toolkit: "slack" | "notion";
  label: string;
  busy: boolean;
  onClick: () => void;
  quiet?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={quiet ? "ghost" : "outline"}
          size="icon-sm"
          aria-label={label}
          title={label}
          className={
            quiet
              ? "size-8 rounded-none text-graphite hover:bg-transparent hover:text-ink"
              : "size-8 border-rule"
          }
          disabled={busy}
          onClick={onClick}
        >
          <AppLogo toolkit={toolkit} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
