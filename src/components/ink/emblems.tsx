import type { PerspectiveId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * An instrument for each seat at the table, drawn in line.
 *
 * Instruments rather than faces: these are five ways of measuring the same
 * decision, not five little people. The Contrarian gets the crow because it is
 * the only one whose job is to be unwelcome.
 */

interface EmblemProps {
  className?: string;
  strokeWidth?: number;
}

function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={cn("h-10 w-10 text-ink", className)}
      style={{ filter: "url(#ink-rough)" }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Dividers — what it costs to build, measured off the drawing. */
function TechnicalEmblem({ className, strokeWidth = 1.5 }: EmblemProps) {
  return (
    <Frame className={className}>
      <circle cx="24" cy="9" r="3.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M22 12 L13 39" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M26 12 L35 39" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M17 27 Q 24 31, 31 27" stroke="currentColor" strokeWidth={strokeWidth * 0.8} />
      <path d="M11 39 L15 39" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M33 39 L37 39" stroke="currentColor" strokeWidth={strokeWidth} />
    </Frame>
  );
}

/** A loupe over the grid — whether anyone will feel the difference. */
function ProductEmblem({ className, strokeWidth = 1.5 }: EmblemProps) {
  return (
    <Frame className={className}>
      <circle cx="20" cy="20" r="11.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M28.5 28.5 L40 40" stroke="currentColor" strokeWidth={strokeWidth * 1.2} />
      <path d="M14 20 H 26" stroke="currentColor" strokeWidth={strokeWidth * 0.7} />
      <path d="M20 14 V 26" stroke="currentColor" strokeWidth={strokeWidth * 0.7} />
      <path d="M13 14 Q 16 11, 20 10.5" stroke="currentColor" strokeWidth={strokeWidth * 0.7} />
    </Frame>
  );
}

/** A horn — whether anyone ever hears about it. */
function GtmEmblem({ className, strokeWidth = 1.5 }: EmblemProps) {
  return (
    <Frame className={className}>
      <path
        d="M8 20 L22 12 L22 36 L8 28 Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path d="M11 28 L11 36 L15 36 L15 30" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
      <path d="M28 16 Q 33 24, 28 32" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
      <path d="M34 11 Q 42 24, 34 37" stroke="currentColor" strokeWidth={strokeWidth * 0.7} />
    </Frame>
  );
}

/** A balance — what it costs in money and in time. */
function FinancialEmblem({ className, strokeWidth = 1.5 }: EmblemProps) {
  return (
    <Frame className={className}>
      <path d="M24 10 V 36" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M15 40 H 33" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M24 36 Q 24 40, 19 40" stroke="currentColor" strokeWidth={strokeWidth * 0.8} />
      <path d="M24 36 Q 24 40, 29 40" stroke="currentColor" strokeWidth={strokeWidth * 0.8} />
      <path d="M9 15 L 39 13" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="24" cy="9" r="2.4" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
      <path d="M9 15 L 4 25 Q 9 29, 14 25 Z" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
      <path d="M39 13 L 34 23 Q 39 27, 44 23 Z" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
    </Frame>
  );
}

/** The crow — the only seat whose job is to be unwelcome. */
function ContrarianEmblem({ className, strokeWidth = 1.5 }: EmblemProps) {
  return (
    <Frame className={cn("text-oxblood", className)}>
      <path
        d="M13 34 Q 9 24, 17 17 Q 24 11, 31 13 L 39 10 L 34 16 Q 38 24, 33 31 Q 27 38, 18 37 Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path d="M31 13 L 41 15 L 33 18" stroke="currentColor" strokeWidth={strokeWidth * 0.9} />
      <circle cx="31.5" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M20 22 Q 27 26, 31 33" stroke="currentColor" strokeWidth={strokeWidth * 0.7} />
      <path d="M18 37 L 16 43" stroke="currentColor" strokeWidth={strokeWidth * 0.8} />
      <path d="M25 37 L 24 43" stroke="currentColor" strokeWidth={strokeWidth * 0.8} />
    </Frame>
  );
}

const EMBLEMS: Record<PerspectiveId, (props: EmblemProps) => React.ReactElement> = {
  technical: TechnicalEmblem,
  product: ProductEmblem,
  gtm: GtmEmblem,
  financial: FinancialEmblem,
  contrarian: ContrarianEmblem,
};

export function PerspectiveEmblem({
  perspective,
  className,
}: {
  perspective: PerspectiveId;
  className?: string;
}) {
  const Emblem = EMBLEMS[perspective] ?? ContrarianEmblem;
  return <Emblem className={className} />;
}

/**
 * The landing hero: an empty chair drawn opposite the reader. The whole
 * product is the second chair, so that is the picture.
 */
export function SecondChair({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 240"
      className={cn("h-auto w-full text-ink", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "url(#ink-rough)" }}
    >
      {/* the table, seen edge-on */}
      <path d="M18 150 H 302" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 150 L 26 154 H 296 L 302 150" stroke="currentColor" strokeWidth="1.1" />
      <path d="M44 154 V 214" stroke="currentColor" strokeWidth="1.4" />
      <path d="M276 154 V 214" stroke="currentColor" strokeWidth="1.4" />

      {/* the founder's chair, near side, drawn as a back only */}
      <path d="M96 214 V 168" stroke="currentColor" strokeWidth="1.4" />
      <path d="M150 214 V 168" stroke="currentColor" strokeWidth="1.4" />
      <path d="M92 168 H 154" stroke="currentColor" strokeWidth="1.6" />
      <path d="M94 178 H 152" stroke="currentColor" strokeWidth="1" />

      {/* the second chair, far side, empty — drawn in red */}
      <path d="M176 138 V 96" stroke="var(--oxblood)" strokeWidth="1.4" />
      <path d="M230 138 V 96" stroke="var(--oxblood)" strokeWidth="1.4" />
      <path d="M172 96 H 234" stroke="var(--oxblood)" strokeWidth="1.6" />
      <path d="M174 106 H 232" stroke="var(--oxblood)" strokeWidth="1" />
      <path d="M176 138 H 230" stroke="var(--oxblood)" strokeWidth="1.2" />

      {/* papers between them */}
      <path d="M118 146 L 168 146 L 172 136 L 122 136 Z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M128 142 H 160" stroke="currentColor" strokeWidth="0.8" />
      <path d="M126 139 H 156" stroke="currentColor" strokeWidth="0.8" />

      {/* crosshatch shadow under the table */}
      {Array.from({ length: 16 }, (_, index) => (
        <path
          key={index}
          d={`M${52 + index * 14} 220 L ${60 + index * 14} 226`}
          stroke="var(--pencil)"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

/**
 * Five chairs around the table — who argues before you commit.
 */
export function FiveSeats({ className }: { className?: string }) {
  const chairs = [
    { x: 48, ink: "currentColor" },
    { x: 112, ink: "currentColor" },
    { x: 176, ink: "var(--oxblood)" },
    { x: 240, ink: "currentColor" },
    { x: 304, ink: "currentColor" },
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
      <path d="M118 108 H 266" stroke="currentColor" strokeWidth="0.9" />
      <path d="M140 104 H 244" stroke="currentColor" strokeWidth="0.7" />
      {chairs.map((chair) => (
        <g key={chair.x} stroke={chair.ink}>
          <path d={`M${chair.x - 16} 78 V 48`} strokeWidth="1.5" />
          <path d={`M${chair.x + 16} 78 V 48`} strokeWidth="1.5" />
          <path d={`M${chair.x - 20} 48 H ${chair.x + 20}`} strokeWidth="1.7" />
          <path d={`M${chair.x - 16} 78 H ${chair.x + 16}`} strokeWidth="1.2" />
        </g>
      ))}
    </svg>
  );
}

/**
 * A weigh-up needle — the number you put on a decision before reality lands.
 */
export function CommitNeedle({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 148"
      className={cn("h-auto w-full text-ink", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: "url(#ink-rough)" }}
    >
      <path
        d="M28 118 A 112 112 0 0 1 252 118"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M48 118 A 92 92 0 0 1 232 118"
        stroke="var(--rule-strong)"
        strokeWidth="1"
      />
      {Array.from({ length: 11 }, (_, index) => {
        const angle = Math.PI - (index / 10) * Math.PI;
        const inner = index % 5 === 0 ? 78 : 88;
        const x1 = 140 + Math.cos(angle) * inner;
        const y1 = 118 - Math.sin(angle) * inner;
        const x2 = 140 + Math.cos(angle) * 100;
        const y2 = 118 - Math.sin(angle) * 100;
        return (
          <path
            key={index}
            d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`}
            stroke="currentColor"
            strokeWidth={index % 5 === 0 ? 1.5 : 0.9}
          />
        );
      })}
      <path
        d="M140 118 L 78 52"
        stroke="var(--oxblood)"
        strokeWidth="2"
      />
      <circle cx="140" cy="118" r="5" stroke="var(--oxblood)" strokeWidth="1.6" />
      <path d="M36 128 H 244" stroke="currentColor" strokeWidth="1.2" />
      <path d="M36 128 V 136" stroke="currentColor" strokeWidth="1.1" />
      <path d="M244 128 V 136" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** GitHub's mark, drawn in the same line weight as the rest of the notebook. */
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("h-4 w-4 fill-current", className)}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.7 7.7 0 0 1 8 4.77c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
