"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { useArena } from "@/lib/store";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";

type BodyId =
  | "product"
  | "users"
  | "code"
  | "market"
  | "decisions"
  | "risks"
  | "bets";

type Tone = "ink" | "indigo" | "oxblood" | "ochre" | "moss";

type Body = {
  id: BodyId;
  label: string;
  tone: Tone;
  x: number;
  y: number;
  tag: "above" | "below" | "left" | "right";
  count: number;
  line: string;
};

const EDGES: Array<[BodyId, BodyId]> = [
  ["product", "users"],
  ["product", "code"],
  ["product", "market"],
  ["users", "decisions"],
  ["code", "decisions"],
  ["market", "decisions"],
  ["decisions", "risks"],
  ["decisions", "bets"],
];

const DUST: Array<[number, number, number]> = [
  [72, 48, 1.1],
  [148, 92, 0.8],
  [310, 36, 1.2],
  [455, 22, 0.7],
  [640, 54, 1],
  [910, 88, 0.9],
  [40, 220, 0.7],
  [960, 250, 1.1],
  [88, 400, 0.8],
  [940, 430, 0.9],
  [420, 455, 0.7],
  [700, 20, 0.6],
];

export function CompanyDna({
  company,
  onOpen,
}: {
  company: Company;
  onOpen?: (question: string, context: string) => void;
}) {
  const decisions = useArena((state) => state.decisions);
  const risks = useArena((state) => state.risks);
  const { brain } = company;
  const [active, setActive] = useState<BodyId>("decisions");

  const bodies = useMemo<Body[]>(() => {
    const latest = decisions[0];
    const openRisk = risks.find((risk) => risk.status === "open");
    const userFacts = brain.facts.filter((fact) =>
      /user|customer|waitlist|founder/i.test(fact.statement),
    );

    return [
      {
        id: "product",
        label: "Product",
        tone: "indigo",
        x: 400,
        y: 88,
        tag: "right",
        count: brain.product.features.length,
        line: brain.product.features[0] ?? brain.product.name,
      },
      {
        id: "users",
        label: "Users",
        tone: "moss",
        x: 160,
        y: 175,
        tag: "below",
        count: userFacts.length,
        line: userFacts[0]?.statement ?? "No customers on record yet.",
      },
      {
        id: "market",
        label: "Market",
        tone: "ink",
        x: 840,
        y: 145,
        tag: "left",
        count: brain.market.problems.length,
        line: brain.market.icp || brain.market.problems[0] || "Market still thin.",
      },
      {
        id: "decisions",
        label: "Decisions",
        tone: "ink",
        x: 490,
        y: 240,
        tag: "left",
        count: decisions.length,
        line: latest?.question ?? "No decision has been argued yet.",
      },
      {
        id: "code",
        label: "Code",
        tone: "ink",
        x: 220,
        y: 355,
        tag: "right",
        count: brain.technical.stack.length,
        line: brain.technical.stack[0] ?? "Stack not on record.",
      },
      {
        id: "risks",
        label: "Risks",
        tone: "oxblood",
        x: 510,
        y: 400,
        tag: "right",
        count: risks.filter((risk) => risk.status === "open").length,
        line: openRisk?.title ?? "No open risks on the table.",
      },
      {
        id: "bets",
        label: "Bets",
        tone: "ochre",
        x: 780,
        y: 330,
        tag: "below",
        count: brain.assumptions.length,
        line: brain.assumptions[0]?.statement ?? "No bets written down.",
      },
    ];
  }, [brain, decisions, risks]);

  const selected = bodies.find((body) => body.id === active) ?? bodies[3];
  const lit = new Set(
    EDGES.flatMap(([from, to]) =>
      from === active || to === active ? [from, to] : [],
    ),
  );

  return (
    <section id="company-dna" className="border border-rule bg-leaf">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule bg-paper px-4 py-3">
        <p className="type-eyebrow">Company DNA</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-graphite">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              Site
            </a>
          ) : null}
          {company.website && /indieterminal\.com/i.test(company.website) ? (
            <a
              href={`${company.website.replace(/\/$/, "")}/command`}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              /command
            </a>
          ) : null}
          {company.github ? (
            <a
              href={company.github}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              Repo
            </a>
          ) : null}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {bodies.map((body) => (
          <button
            key={`m-${body.id}`}
            type="button"
            aria-pressed={body.id === active}
            onClick={() => setActive(body.id)}
            className={cn(
              "border border-rule bg-paper px-4 py-3 text-left",
              body.id === active && "bg-leaf",
            )}
          >
            <p className={cn("type-eyebrow", toneText(body.tone))}>{body.label}</p>
            <p className="type-display mt-1 text-[20px] font-semibold leading-none">
              {body.count}
            </p>
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-graphite">
              {body.line}
            </p>
          </button>
        ))}
      </div>

      <div className="relative hidden h-[min(58vh,36rem)] w-full overflow-hidden paper-grid lg:block">
        <svg
          viewBox="0 0 1000 480"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          {DUST.map(([x, y, r], index) => (
            <circle
              key={`${x}-${y}-${index}`}
              cx={x}
              cy={y}
              r={r}
              fill="var(--pencil)"
              opacity="0.45"
            />
          ))}
          {EDGES.map(([from, to]) => {
            const a = bodies.find((body) => body.id === from)!;
            const b = bodies.find((body) => body.id === to)!;
            const live = from === active || to === active;
            return (
              <path
                key={`${from}-${to}`}
                d={curve(a, b)}
                fill="none"
                stroke={live ? toneStroke(selected.tone) : "var(--rule-strong)"}
                strokeWidth={live ? 1.8 : 1.15}
                strokeLinecap="round"
                style={{ filter: "url(#ink-rough)" }}
              />
            );
          })}
          {bodies.map((body) => {
            const r = radius(body.count, body.id === "decisions");
            const on = body.id === active || lit.has(body.id);
            return (
              <g key={body.id}>
                {body.id === "decisions" ? (
                  <circle
                    cx={body.x}
                    cy={body.y}
                    r={r + 10}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="1"
                    opacity="0.35"
                  />
                ) : null}
                <circle
                  cx={body.x}
                  cy={body.y}
                  r={r}
                  fill={on ? toneFill(body.tone) : "var(--paper)"}
                  stroke={toneStroke(body.tone)}
                  strokeWidth="1.6"
                />
              </g>
            );
          })}
        </svg>

        {bodies.map((body) => (
          <button
            key={body.id}
            type="button"
            aria-pressed={body.id === active}
            onClick={() => setActive(body.id)}
            className={cn(
              "absolute z-10 w-[min(200px,28%)] border bg-paper px-3 py-2 text-left transition-colors",
              body.id === active ? "border-ink" : "border-rule hover:border-ink",
            )}
            style={tagStyle(body)}
          >
            <p className={cn("type-eyebrow", toneText(body.tone))}>
              {body.label}
            </p>
            <p className="type-display mt-0.5 text-[22px] font-semibold leading-none">
              {body.count}
            </p>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-graphite">
              {body.line}
            </p>
          </button>
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper px-4 py-3">
        <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
          <span className={cn("type-eyebrow mr-2", toneText(selected.tone))}>
            {selected.label}
          </span>
          {selected.line}
        </p>
        {onOpen && (selected.id === "decisions" || selected.id === "bets" || selected.id === "risks") ? (
          <button
            type="button"
            className="type-eyebrow shrink-0 text-indigo"
            onClick={() =>
              onOpen(
                selected.id === "decisions" && decisions[0]
                  ? decisions[0].question
                  : `What should we do about ${selected.label.toLowerCase()}?`,
                selected.line,
              )
            }
          >
            Take this to the Arena
          </button>
        ) : null}
      </footer>
    </section>
  );
}

function radius(count: number, hub: boolean) {
  return (hub ? 14 : 8) + Math.min(hub ? 16 : 14, count * 2.4);
}

function curve(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const lift = 36;
  return `M ${a.x} ${a.y} Q ${mx - (dy / len) * lift} ${my + (dx / len) * lift} ${b.x} ${b.y}`;
}

function tagStyle(body: Body): CSSProperties {
  const left = `${(body.x / 1000) * 100}%`;
  const top = `${(body.y / 480) * 100}%`;
  if (body.tag === "above") {
    return { left, top, transform: "translate(-50%, calc(-100% - 18px))" };
  }
  if (body.tag === "below") {
    return { left, top, transform: "translate(-50%, 22px)" };
  }
  if (body.tag === "left") {
    return { left, top, transform: "translate(calc(-100% - 20px), -50%)" };
  }
  return { left, top, transform: "translate(20px, -50%)" };
}

function toneStroke(tone: Tone) {
  if (tone === "indigo") return "var(--indigo)";
  if (tone === "oxblood") return "var(--oxblood)";
  if (tone === "ochre") return "var(--ochre)";
  if (tone === "moss") return "var(--moss)";
  return "var(--ink)";
}

function toneFill(tone: Tone) {
  if (tone === "indigo") return "var(--indigo-wash)";
  if (tone === "oxblood") return "var(--oxblood-wash)";
  if (tone === "ochre") return "var(--ochre-wash)";
  if (tone === "moss") return "var(--moss-wash)";
  return "var(--paper)";
}

function toneText(tone: Tone) {
  if (tone === "indigo") return "text-indigo";
  if (tone === "oxblood") return "text-oxblood";
  if (tone === "ochre") return "text-ochre";
  if (tone === "moss") return "text-moss";
  return "text-ink";
}
