import type { ArgumentStance, PerspectiveId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Drawings for the shared table: seats, stance stamps, and tokens.
 * These are the things a founder sees before they read a paragraph.
 */

export function StanceStamp({
  stance,
  className,
}: {
  stance: ArgumentStance;
  className?: string;
}) {
  if (stance === "for") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 48 48"
        className={cn("size-11 text-indigo", className)}
        fill="none"
        style={{ filter: "url(#ink-rough)" }}
      >
        <path
          d="M10 24 L20 34 L40 12"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (stance === "against") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 48 48"
        className={cn("size-11 text-oxblood", className)}
        fill="none"
        style={{ filter: "url(#ink-rough)" }}
      >
        <path d="M12 12 L36 36" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M36 12 L12 36" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={cn("size-11 text-ochre", className)}
      fill="none"
      style={{ filter: "url(#ink-rough)" }}
    >
      <path
        d="M14 18 Q 24 8, 34 18 Q 24 28, 14 30"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="38" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ObjectMark({
  kind,
  className,
}: {
  kind: "contradiction" | "risk" | "evidence" | "action";
  className?: string;
}) {
  const tone =
    kind === "contradiction"
      ? "text-oxblood"
      : kind === "risk"
        ? "text-ochre"
        : "text-ink";

  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className={cn("size-8", tone, className)}
      fill="none"
      style={{ filter: "url(#ink-rough)" }}
    >
      {kind === "contradiction" ? (
        <>
          <ellipse cx="20" cy="20" rx="15" ry="13" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 12 L28 28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "risk" ? (
        <>
          <path
            d="M20 6 L36 33 H4 Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M20 16 V 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="28" r="1.2" fill="currentColor" />
        </>
      ) : null}
      {kind === "evidence" ? (
        <>
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 12 V 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="27" r="1.2" fill="currentColor" />
        </>
      ) : null}
      {kind === "action" ? (
        <>
          <rect x="7" y="8" width="26" height="24" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 16 H28" stroke="currentColor" strokeWidth="1.3" />
          <path d="M12 22 H24" stroke="currentColor" strokeWidth="1.3" />
        </>
      ) : null}
    </svg>
  );
}

const SEAT_X = [44, 118, 192, 266, 340];

export function TableSketch({
  writing,
  ready,
  filled,
  className,
}: {
  writing: PerspectiveId[];
  ready: PerspectiveId[];
  filled: PerspectiveId[];
  className?: string;
}) {
  const seats: PerspectiveId[] = [
    "technical",
    "product",
    "gtm",
    "financial",
    "contrarian",
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 384 168"
      className={cn("h-auto w-full text-ink", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "url(#ink-rough)" }}
    >
      <ellipse
        cx="192"
        cy="118"
        rx="168"
        ry="36"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <ellipse
        cx="192"
        cy="112"
        rx="158"
        ry="28"
        stroke="var(--rule-strong)"
        strokeWidth="1"
      />
      <path d="M40 118 L 44 148" stroke="currentColor" strokeWidth="1.3" />
      <path d="M344 118 L 340 148" stroke="currentColor" strokeWidth="1.3" />

      {seats.map((id, index) => {
        const x = SEAT_X[index];
        const isWriting = writing.includes(id);
        const isFilled = filled.includes(id);
        const isReady = ready.includes(id);
        const stroke = isWriting
          ? "var(--oxblood)"
          : isFilled
            ? "var(--ink)"
            : "var(--pencil)";

        return (
          <g key={id}>
            <path
              d={`M${x - 16} 78 V 48`}
              stroke={stroke}
              strokeWidth="1.5"
            />
            <path
              d={`M${x + 16} 78 V 48`}
              stroke={stroke}
              strokeWidth="1.5"
            />
            <path
              d={`M${x - 20} 48 H ${x + 20}`}
              stroke={stroke}
              strokeWidth="1.7"
            />
            <path
              d={`M${x - 16} 78 H ${x + 16}`}
              stroke={stroke}
              strokeWidth="1.2"
            />
            {isWriting ? (
              <path
                d={`M${x - 8} 36 L ${x + 10} 30`}
                stroke="var(--oxblood)"
                strokeWidth="1.6"
              />
            ) : null}
            {isReady && !isFilled ? (
              <circle cx={x} cy={36} r="3" fill="var(--moss)" stroke="none" />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function BalanceSketch({
  forPct,
  className,
}: {
  forPct: number;
  className?: string;
}) {
  const tilt = ((50 - forPct) / 50) * 12;

  return (
    <svg
      aria-hidden
      viewBox="0 0 280 72"
      className={cn("h-16 w-full text-ink", className)}
      fill="none"
      strokeLinecap="round"
      style={{ filter: "url(#ink-rough)" }}
    >
      <path d="M140 10 V 58" stroke="currentColor" strokeWidth="1.5" />
      <path d="M110 64 H 170" stroke="currentColor" strokeWidth="1.4" />
      <g transform={`rotate(${tilt} 140 18)`}>
        <path d="M40 20 H 240" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M48 20 L 36 42 Q 48 50, 60 42 Z"
          stroke="var(--indigo)"
          strokeWidth="1.5"
        />
        <path
          d="M232 20 L 220 42 Q 232 50, 244 42 Z"
          stroke="var(--oxblood)"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
