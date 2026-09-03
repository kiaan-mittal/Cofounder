"use client";

import { usePathname, useRouter } from "next/navigation";

import { writeArenaDraft } from "@/lib/drafts";
import { useArena } from "@/lib/store";
import { scheduleWorkspaceSave } from "@/lib/supabase/sync";
import { cn } from "@/lib/utils";

export function NewArenaButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  function start() {
    writeArenaDraft({ question: "", context: "" });
    useArena.getState().beginNewArena();
    scheduleWorkspaceSave();
    if (!pathname.startsWith("/arena")) {
      router.push("/arena");
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      title="New decision"
      aria-label="New decision"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 bg-ink px-2.5 text-[12px] text-paper transition-colors hover:bg-ink/90",
        className,
      )}
    >
      <span aria-hidden className="type-figure text-[15px] leading-none">
        +
      </span>
      <span className="hidden sm:inline">New decision</span>
    </button>
  );
}
