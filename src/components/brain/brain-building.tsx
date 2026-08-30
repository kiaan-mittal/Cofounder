"use client";

import { InkRule } from "@/components/ink/marks";
import type { BrainStage, ReadingExcerpt } from "@/lib/reading";
import { cn } from "@/lib/utils";

const STAGES: { key: BrainStage; label: string }[] = [
  { key: "website", label: "Crawling every public page it can reach" },
  { key: "github", label: "Reading the repository in depth" },
  { key: "separate", label: "Separating facts from assumptions" },
  { key: "assemble", label: "Assembling the Company Brain" },
];

const SOURCE_LABEL = {
  website: "Website",
  github: "Repository",
  docs: "Documentation",
} as const;

export function BrainBuilding({
  website,
  github,
  stage,
  excerpts,
}: {
  website: string;
  github: string;
  stage: BrainStage;
  excerpts: ReadingExcerpt[];
}) {
  const active = STAGES.findIndex((item) => item.key === stage);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-14 lg:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(28ch,42ch)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="type-eyebrow">Building your Company Brain</p>

          <h1 className="type-display mt-6 text-[clamp(2rem,4.5vw,3rem)] font-semibold">
            Scraping the public company — not just the homepage.
          </h1>

          <div className="mt-4 space-y-1">
            {website ? (
              <p className="type-figure text-[13px] text-graphite">{website}</p>
            ) : null}
            {github ? (
              <p className="type-figure text-[13px] text-graphite">{github}</p>
            ) : null}
          </div>

          <InkRule className="mt-10 max-w-[320px]" />

          <ol className="mt-8 space-y-4">
            {STAGES.map((item, index) => {
              const hidden =
                (item.key === "website" && !website) ||
                (item.key === "github" && !github);
              if (hidden) return null;

              const state =
                index < active
                  ? "done"
                  : index === active
                    ? "active"
                    : "waiting";

              return (
                <li key={item.key} className="flex items-center gap-4">
                  <span
                    className={cn(
                      "type-figure w-6 text-[12px]",
                      state === "waiting" ? "text-pencil" : "text-ink",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "text-[17px]",
                      state === "waiting" ? "text-pencil" : "text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  {state === "active" ? (
                    <span className="type-eyebrow ml-auto animate-pulse">
                      reading
                    </span>
                  ) : null}
                  {state === "done" ? (
                    <span className="type-eyebrow ml-auto text-moss">read</span>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <p className="mt-12 max-w-[46ch] text-sm leading-relaxed text-graphite">
            Pricing, about, docs, changelog, issues and stack files land here
            as they are read. Nothing in this column is invented. Stay on this
            page; if it remounts, the build continues from here.
          </p>
        </div>

        <aside className="min-h-[28rem] border border-rule bg-leaf lg:sticky lg:top-20">
          {excerpts.length === 0 ? (
            <div className="flex h-full min-h-[28rem] flex-col justify-end paper-ruled p-6">
              <p className="type-eyebrow">Live read</p>
              <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-graphite">
                Passages appear here as they are taken from the page and the
                repository. Nothing is invented in this column.
              </p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <p className="type-eyebrow">Live coverage · {excerpts.length} sources</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {excerpts.map((excerpt) => (
                  <li
                    key={`chip-${excerpt.url}`}
                    className="border border-rule bg-paper px-2 py-1 type-eyebrow text-ink"
                  >
                    {excerpt.title || excerpt.source}
                  </li>
                ))}
              </ul>
              <div className="mt-8 space-y-10">
                {excerpts.map((excerpt) => (
                  <section key={`${excerpt.source}-${excerpt.url}`}>
                    <p className="type-eyebrow text-ink">
                      {SOURCE_LABEL[excerpt.source]}
                    </p>
                    <p className="type-display mt-2 text-[22px] font-semibold">
                      {excerpt.title}
                    </p>
                    <p className="type-figure mt-1 text-[12px] text-pencil">
                      {excerpt.url}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {excerpt.lines.map((line, index) => (
                        <li
                          key={`${excerpt.source}-${index}`}
                          className={cn(
                            "leading-relaxed",
                            line.kind === "heading" &&
                              "text-[16px] font-medium text-ink",
                            line.kind === "body" && "text-[15px] text-graphite",
                            (line.kind === "commit" || line.kind === "file") &&
                              "type-figure text-[13px] text-ink",
                            line.kind === "issue" &&
                              "text-[13.5px] text-ochre",
                            line.kind === "meta" && "text-[13px] text-pencil",
                          )}
                        >
                          {line.kind === "commit" ? `↳ ${line.text}` : line.text}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
