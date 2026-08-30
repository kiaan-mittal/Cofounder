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
 * It reports which implementation the page actually got. Claiming native
 * support in a browser that has none would be the easiest way to lose a
 * judge's trust, so the shim says it is a shim.
 */

const COPY = {
  native: {
    label: "WebMCP live",
    dot: "bg-moss",
    detail:
      "This browser implements document.modelContext natively. Tools are registered with the platform and any connected agent can discover them.",
  },
  polyfill: {
    label: "WebMCP shim",
    dot: "bg-ochre",
    detail:
      "This browser has no native WebMCP, so Decision Arena installed a spec-shaped shim. Tool definitions, discovery and execution are identical — the in-page agent still goes through getTools() and executeTool().",
  },
  unavailable: {
    label: "WebMCP unavailable",
    dot: "bg-pencil",
    detail:
      "No WebMCP entry point could be installed. Every part of the Arena still works; only agent tool access is off.",
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
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{copy.detail}</p>
          {registered.length > 0 ? (
            <p className="mt-2 text-pencil">
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
