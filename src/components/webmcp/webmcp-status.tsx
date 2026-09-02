"use client";

import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWebMCP } from "@/webmcp/provider";

/**
 * An honest status indicator.
 *
 * It reports which context the tools actually ended up on. Claiming native
 * support in a browser that has none would be the easiest way to lose a
 * judge's trust, so a page context says it is a page context.
 */

const COPY = {
  native: {
    label: "WebMCP native",
    dot: "bg-moss",
    detail:
      "This browser implements document.modelContext natively. Tools are registered with the platform. That is the demo path — ChatGPT Sol/Terra or Chrome with the WebMCP flag.",
  },
  page: {
    label: "in-page fallback",
    dot: "bg-ochre",
    detail:
      "This browser does not implement WebMCP. Tools sit on a private page object so seats and the in-page agent still work. document.modelContext is untouched. Open this URL in ChatGPT desktop Sol/Terra (site tools on) or Chrome 149+ with chrome://flags/#enable-webmcp-testing to show the native path.",
  },
  unavailable: {
    label: "WebMCP unavailable",
    dot: "bg-pencil",
    detail:
      "No native document.modelContext yet. If this stays empty, this tab cannot prove native WebMCP — switch to Sol, Terra, or Chrome with the flag.",
  },
} as const;

export function WebMCPStatus({ className }: { className?: string }) {
  const { support, registered, ready, error } = useWebMCP();
  const copy = COPY[support];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/webmcp"
            className={cn(
              "type-eyebrow inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1.5 transition-colors hover:border-ink hover:text-ink",
              className,
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                ready ? copy.dot : "bg-rule-strong",
              )}
            />
            {ready ? copy.label : "WebMCP…"}
            {registered.length > 0 ? (
              <span className="text-pencil">{registered.length}</span>
            ) : null}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          <p>{copy.detail}</p>
          {registered.length > 0 ? (
            <p className="mt-2 text-[13px] text-graphite">
              {registered.length} tools registered. Open the tool surface for the
              full list.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-oxblood">{error}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
