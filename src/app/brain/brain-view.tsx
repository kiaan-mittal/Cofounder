"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArenaPath } from "@/components/arena/the-loop";
import { CompanyDna } from "@/components/brain/company-dna";
import { InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { DEMO_COMPANY_ID } from "@/lib/demo-seed";
import { writeArenaDraft } from "@/lib/drafts";
import type { Assumption, BrainDossierPage, Company, Fact } from "@/lib/types";

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
  const dossier = brain.dossier ?? [];

  function takeToArena(question: string, context: string) {
    writeArenaDraft({ question, context });
    const params = new URLSearchParams({ q: question });
    if (context) params.set("c", context);
    router.push(`/arena?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-12 lg:py-16">
      <ArenaPath here="brain" />
      {isDemo ? (
        <p className="type-eyebrow mb-8 inline-block border border-ochre bg-ochre-wash px-3 py-1.5 text-ochre">
          Sample data — a fictional company, for demonstration
        </p>
      ) : null}

      <header className="mt-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[58ch]">
          <p className="type-eyebrow">Company Brain</p>
          <h1 className="type-display mt-4 text-[clamp(1.8rem,3.8vw,2.75rem)] font-semibold leading-[1.08]">
            {brain.headline}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-graphite">
            {brain.summary}
          </p>
        </div>
        <Button asChild size="lg" className="h-11 px-6 text-[15px]">
          <Link href="/arena">Take a decision into the Arena</Link>
        </Button>
      </header>

      <div className="mt-8">
        <CompanyDna company={company} onOpen={takeToArena} />
      </div>

      <div className="mt-4 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {company.sources.map((source) => (
          <article key={`${source.kind}-${source.url}`} className="bg-paper px-4 py-4">
            <p
              className={
                source.ok ? "type-eyebrow text-moss" : "type-eyebrow text-oxblood"
              }
            >
              {source.ok ? "read" : "failed"}
            </p>
            <p className="type-figure mt-2 truncate text-[12px] text-ink">
              {source.url}
            </p>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-graphite">
              {source.detail}
            </p>
          </article>
        ))}
        {brain.gaps.length ? (
          <article className="bg-ochre-wash px-4 py-4">
            <p className="type-eyebrow text-ochre">Not known</p>
            <ul className="mt-2 space-y-1.5">
              {brain.gaps.slice(0, 3).map((gap) => (
                <li key={gap} className="line-clamp-2 text-[13px] leading-snug text-ink">
                  {gap}
                </li>
              ))}
            </ul>
          </article>
        ) : coverage.length ? (
          <article className="bg-paper px-4 py-4">
            <p className="type-eyebrow">
              Coverage · {coverage.length}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-graphite">
              {coverage
                .map((page) => page.title)
                .filter(Boolean)
                .slice(0, 3)
                .join(" · ")}
            </p>
          </article>
        ) : null}
      </div>

      {dossier.length ? (
        <>
          <InkRule className="my-14" />
          <section>
            <div className="flex items-baseline gap-3">
              <h2 className="type-display text-3xl font-semibold">
                Pages on the record
              </h2>
              <span className="type-eyebrow">{dossier.length} quoted</span>
            </div>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-graphite">
              Verbatim excerpts the Arena keeps and quotes in every round.
              Rebuild the Brain after changing the site.
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {dossier.map((page) => (
                <DossierCard key={page.url} page={page} />
              ))}
            </ul>
          </section>
        </>
      ) : null}

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

function DossierCard({ page }: { page: BrainDossierPage }) {
  return (
    <li className="border border-rule bg-leaf px-5 py-4">
      <p className="type-eyebrow">{page.role}</p>
      <p className="mt-2 text-[15px] font-medium leading-snug text-ink">
        {page.title}
      </p>
      <p className="type-figure mt-1 truncate text-[12px] text-graphite">
        {page.url}
      </p>
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-graphite">
        {page.excerpt}
      </p>
    </li>
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
