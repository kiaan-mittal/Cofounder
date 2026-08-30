"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { DEMO_COMPANY_ID } from "@/lib/demo-seed";
import { writeArenaDraft } from "@/lib/drafts";
import type { Assumption, Company, Fact } from "@/lib/types";

export function BrainView({
  initialSnapshot,
}: {
  initialSnapshot?: Record<string, unknown> | null;
}) {
  return (
    <RequireCompany initialSnapshot={initialSnapshot}>
      {(company) => <Brain company={company} />}
    </RequireCompany>
  );
}

function Brain({ company }: { company: Company }) {
  const router = useRouter();
  const { brain } = company;
  const isDemo = company.id === DEMO_COMPANY_ID;
  const coverage = company.sources.flatMap((source) => source.pages ?? []);

  function takeToArena(question: string, context: string) {
    writeArenaDraft({ question, context });
    const params = new URLSearchParams({ q: question });
    if (context) params.set("c", context);
    router.push(`/arena?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      {isDemo ? (
        <p className="type-eyebrow mb-8 inline-block border border-ochre bg-ochre-wash px-3 py-1.5 text-ochre">
          Sample data — a fictional company, for demonstration
        </p>
      ) : null}

      <header className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <div>
          <p className="type-eyebrow">Company Brain</p>
          <h1 className="type-display mt-5 text-[clamp(2rem,4.4vw,3.25rem)] font-semibold">
            {brain.headline}
          </h1>
          <p className="mt-7 max-w-[62ch] text-[17px] leading-relaxed text-graphite">
            {brain.summary}
          </p>
          <Button asChild size="lg" className="mt-9 h-11 px-6 text-[15px]">
            <Link href="/arena">Take a decision into the Arena</Link>
          </Button>
        </div>

        <aside className="space-y-6 lg:pt-11">
          <div>
            <p className="type-eyebrow">
              Coverage · {coverage.length || company.sources.length} sources
            </p>
            <ul className="mt-3 space-y-3">
              {company.sources.map((source) => (
                <li key={`${source.kind}-${source.url}`} className="flex gap-3">
                  <span
                    className={
                      source.ok
                        ? "type-eyebrow shrink-0 text-moss"
                        : "type-eyebrow shrink-0 text-oxblood"
                    }
                  >
                    {source.ok ? "read" : "failed"}
                  </span>
                  <span className="min-w-0">
                    <span className="type-figure block truncate text-[12px] text-ink">
                      {source.url}
                    </span>
                    <span className="text-[13px] leading-relaxed text-graphite">
                      {source.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {coverage.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {coverage.map((page) => (
                  <li
                    key={page.url}
                    className="border border-rule bg-leaf px-2 py-1"
                  >
                    <span className="type-eyebrow text-ink">{page.role}</span>
                    <span className="mt-0.5 block max-w-[22ch] truncate text-[12px] text-graphite">
                      {page.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {brain.gaps.length ? (
            <div className="border border-rule bg-ochre-wash px-4 py-3">
              <p className="type-eyebrow text-ochre">What is not known</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink">
                {brain.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </header>

      <InkRule className="my-14" />

      {/* Facts vs assumptions — the distinction the whole product rests on */}
      <section className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="type-display text-3xl font-semibold">Facts</h2>
            <span className="type-eyebrow">{brain.facts.length} on record</span>
          </div>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-graphite">
            Things your sources actually say. Each one is quotable, so you can
            check the Arena&rsquo;s work.
          </p>
          <ul className="mt-8 space-y-6">
            {brain.facts.map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="type-display text-3xl font-semibold">Assumptions</h2>
            <span className="type-eyebrow">
              {brain.assumptions.length} unproven
            </span>
          </div>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-graphite">
            Things you are betting on that no source proves. These are what the
            Arena will attack.
          </p>
          <ul className="mt-8 space-y-6">
            {brain.assumptions.map((assumption) => (
              <AssumptionCard
                key={assumption.id}
                assumption={assumption}
                onAttack={() =>
                  takeToArena(
                    `Should we keep betting that ${assumption.statement}?`,
                    `The Company Brain marked this as a ${assumption.risk}-risk assumption. ${assumption.rationale}`,
                  )
                }
              />
            ))}
          </ul>
        </div>
      </section>

      <InkRule className="my-14" />

      <section className="grid gap-12 lg:grid-cols-3 lg:gap-16">
        <Panel title="Product">
          <Line label="What it is">{brain.product.description}</Line>
          <Line label="Maturity">{brain.product.maturity}</Line>
          <List label="Features" items={brain.product.features} />
          <List label="Roadmap signals" items={brain.product.roadmapSignals} />
        </Panel>

        <Panel title="Market">
          <Line label="Who it is for">{brain.market.icp}</Line>
          <Line label="Positioning">{brain.market.positioning}</Line>
          <Line label="Pricing">
            {brain.market.pricing ?? "Not published anywhere the Arena could read."}
          </Line>
          <List label="Customer problems" items={brain.market.problems} />
          <List label="Alternatives" items={brain.market.alternatives} />
        </Panel>

        <Panel title="Technical">
          <List label="Stack" items={brain.technical.stack} inline />
          <Line label="Architecture">{brain.technical.architectureNotes}</Line>
          <List label="Repository" items={brain.technical.repoStructure} inline />
          <List label="Activity" items={brain.technical.activitySignals} />
        </Panel>
      </section>

      {brain.openQuestions.length ? (
        <>
          <InkRule className="my-14" />
          <section>
            <h2 className="type-display text-3xl font-semibold">
              What the Arena would ask you
            </h2>
            <ul className="mt-8 grid gap-x-16 gap-y-5 md:grid-cols-2">
              {brain.openQuestions.map((question) => (
                <li
                  key={question}
                  className="border border-rule bg-leaf px-5 py-4"
                >
                  <p className="text-[17px] leading-relaxed">{question}</p>
                  <button
                    type="button"
                    onClick={() =>
                      takeToArena(
                        question,
                        `Opened from an unanswered question on the Company Brain for ${company.name}.`,
                      )
                    }
                    className="type-eyebrow mt-3 text-indigo"
                  >
                    Argue this on the table
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  return (
    <li className="border border-rule bg-leaf px-5 py-4">
      <p className="text-[15px] leading-relaxed text-ink">{fact.statement}</p>
      {fact.provenance.quote ? (
        <p className="type-display mt-2.5 text-[15px] leading-snug text-graphite">
          &ldquo;{fact.provenance.quote}&rdquo;
        </p>
      ) : null}
      <p className="type-eyebrow mt-2 truncate">
        {fact.provenance.kind}
        {fact.provenance.ref ? ` · ${fact.provenance.ref}` : ""}
      </p>
    </li>
  );
}

function AssumptionCard({
  assumption,
  onAttack,
}: {
  assumption: Assumption;
  onAttack: () => void;
}) {
  const tone =
    assumption.risk === "high"
      ? "border-oxblood"
      : assumption.risk === "medium"
        ? "border-ochre"
        : "border-rule-strong";

  return (
    <li className={`border bg-leaf px-5 py-4 ${tone}`}>
      <p className="text-[15px] leading-relaxed text-ink">
        {assumption.statement}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-graphite">
        {assumption.rationale}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="type-eyebrow">
          {assumption.risk} risk · {assumption.status}
        </p>
        <button
          type="button"
          onClick={onAttack}
          className="type-eyebrow text-oxblood"
        >
          Attack this on the table
        </button>
      </div>
    </li>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="type-display text-2xl font-semibold">{title}</h2>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="type-eyebrow">{label}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function List({
  label,
  items,
  inline = false,
}: {
  label: string;
  items: string[];
  inline?: boolean;
}) {
  if (items.length === 0) return null;

  if (inline) {
    return (
      <div>
        <p className="type-eyebrow">{label}</p>
        <p className="type-figure mt-1.5 text-[13px] leading-relaxed text-ink">
          {items.join(" · ")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="type-eyebrow">{label}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-[15px] leading-relaxed text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
