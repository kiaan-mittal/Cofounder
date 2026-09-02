"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CopyLine({
  text,
  children,
  className,
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 border border-rule bg-leaf px-4 py-3.5",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-[16px] leading-relaxed text-ink">
        {children ?? text}
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="type-eyebrow shrink-0 pt-1 text-graphite underline underline-offset-4 hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
