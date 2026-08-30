"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CanvasTurn({
  value,
  busy,
  onChange,
  onSubmit,
}: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="border border-rule bg-paper"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim().length < 3 || busy) return;
        onSubmit();
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
        <p className="type-eyebrow text-indigo">Your turn</p>
        <p className="text-[13px] text-graphite">
          {busy
            ? "On the map. They are writing back."
            : "This becomes a claim. They answer on the same map."}
        </p>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end">
        <Textarea
          name="turn"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="One sentence. Example: We should launch now — 70% of users asked for it."
          rows={2}
          disabled={busy}
          className="min-h-[72px] flex-1 resize-none rounded-none border-rule bg-paper px-3 py-2 text-[16px] leading-snug shadow-none"
        />
        <Button
          type="submit"
          disabled={busy || value.trim().length < 3}
          className="h-11 shrink-0 px-5"
        >
          {busy ? "They are writing…" : "They answer"}
        </Button>
      </div>
    </form>
  );
}
