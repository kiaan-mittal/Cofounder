import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A labelled writing line — catalogued like a notebook entry, not a SaaS input.
 */
export function Field({
  id,
  label,
  hint,
  optional,
  prefix,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="type-eyebrow">
          {label}
        </label>
        {optional ? (
          <span className="type-eyebrow text-pencil">optional</span>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-graphite">
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          "relative mt-3 flex items-stretch bg-leaf",
          "border border-rule",
          "transition-[border-color,background-color,box-shadow] duration-150",
          "hover:border-rule-strong",
          "focus-within:border-ink focus-within:bg-paper",
        )}
      >
        {prefix ? (
          <span className="type-figure flex shrink-0 items-center self-stretch border-r border-rule bg-tape px-3 text-[11px] tracking-tight text-graphite">
            {prefix}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
