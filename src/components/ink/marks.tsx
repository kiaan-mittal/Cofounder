import { cn } from "@/lib/utils";

/**
 * The marks a person makes on a page they are arguing with: an underline under
 * the phrase that matters, a ring around a contradiction, a rule between
 * sections, tally strokes instead of a progress bar.
 *
 * These carry meaning rather than decoration — the ring only ever appears
 * around something the Arena has actually flagged.
 */

export function InkUnderline({
  className,
  tone = "ink",
  animate = true,
}: {
  className?: string;
  tone?: "ink" | "oxblood" | "indigo";
  animate?: boolean;
}) {
  const stroke =
    tone === "oxblood"
      ? "var(--oxblood)"
      : tone === "indigo"
        ? "var(--indigo)"
        : "var(--ink)";

  return (
    <svg
      aria-hidden
      viewBox="0 0 240 10"
      preserveAspectRatio="none"
      className={cn("h-[8px] w-full", animate && "ink-draw", className)}
      style={{ ["--dash" as string]: "260", filter: "url(#ink-rough)" }}
    >
      <path
        d="M2 6.2 C 42 2.6, 88 8.4, 128 4.6 S 206 3.2, 238 6"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InkRing({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={cn("ink-draw pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ ["--dash" as string]: "620", filter: "url(#ink-rough-strong)" }}
    >
      <path
        d="M100 5 C 40 5, 6 22, 6 40 C 6 60, 48 76, 104 75 C 160 74, 194 58, 193 38 C 192 18, 154 5, 96 6"
        fill="none"
        stroke="var(--oxblood)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InkRule({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 6"
      preserveAspectRatio="none"
      className={cn("h-[6px] w-full text-rule-strong", className)}
      style={{ filter: "url(#ink-rough)" }}
    >
      <path
        d="M0 3 C 120 1.4, 240 4.6, 360 2.8 S 540 1.6, 600 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Confidence as tally strokes. A number alone reads as false precision; twenty
 * strokes with fourteen inked reads as an estimate, which is what it is.
 */
export function HatchMeter({
  value,
  tone = "ink",
  strokes = 20,
  className,
  label,
}: {
  value: number;
  tone?: "ink" | "oxblood" | "indigo" | "ochre";
  strokes?: number;
  className?: string;
  label?: string;
}) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * strokes);
  const colour =
    tone === "oxblood"
      ? "var(--oxblood)"
      : tone === "indigo"
        ? "var(--indigo)"
        : tone === "ochre"
          ? "var(--ochre)"
          : "var(--ink)";

  return (
    <svg
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      viewBox={`0 0 ${strokes * 6} 18`}
      className={cn("h-[18px] w-full", className)}
      style={{ filter: "url(#ink-rough)" }}
    >
      {Array.from({ length: strokes }, (_, index) => {
        const x = index * 6 + 2;
        const on = index < filled;
        return (
          <line
            key={index}
            x1={x}
            y1={on ? 2 : 6}
            x2={x + 2.2}
            y2={on ? 16 : 12}
            stroke={on ? colour : "var(--rule-strong)"}
            strokeWidth={on ? 2 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** Opus's knot: two nibs facing each other. Square crop for icon use. */
export function ArenaMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      style={{ filter: "url(#ink-rough)" }}
    >
      <path
        d="M4 16 H 11.5"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20.5 16 H 28"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11.5 7 L 16 16 L 11.5 25 Z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 7 L 16 16 L 20.5 25 Z"
        fill="none"
        stroke="var(--oxblood)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
