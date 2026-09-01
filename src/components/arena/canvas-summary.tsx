"use client";

import type { CanvasNode, Contradiction } from "@/lib/types";

export function CanvasSummary({
  nodes,
  contradictions,
}: {
  nodes: CanvasNode[];
  contradictions: Contradiction[];
}) {
  const claims = nodes.filter((node) => node.kind === "claim");
  const evidence = nodes.filter((node) => node.kind === "evidence");
  const risks = nodes.filter((node) => node.kind === "risk");
  const assumptions = nodes.filter((node) => node.kind === "assumption");

  const cards = [
    {
      kind: "Claim",
      tone: "text-indigo",
      items: claims.map((node) => `${node.stance ?? "·"} ${node.text}`),
    },
    {
      kind: "Evidence",
      tone: "text-moss",
      items: evidence.map((node) => node.text),
    },
    {
      kind: "Risk",
      tone: "text-oxblood",
      items: risks.map((node) => node.text),
    },
    {
      kind: "Assumption",
      tone: "text-ochre",
      items: assumptions.map((node) => node.text),
    },
    {
      kind: "Tension",
      tone: "text-oxblood",
      items: contradictions.filter((item) => !item.resolved).map((item) => item.summary),
    },
  ].filter((card) => card.items.some((item) => item.trim() && item !== "+" && item !== "-" && item !== "·"));

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article key={card.kind} className="border border-rule bg-paper px-4 py-4">
          <p className={`type-eyebrow ${card.tone}`}>
            {card.kind} · {card.items.length}
          </p>
          <ul className="mt-3 space-y-2">
            {card.items.slice(0, 3).map((item) => (
              <li
                key={item}
                className="text-[13.5px] leading-snug text-ink line-clamp-2"
              >
                {item.replace(/^[-+~·]\s*/, "")}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
