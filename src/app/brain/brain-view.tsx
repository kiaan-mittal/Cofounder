"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CompanyDna } from "@/components/brain/company-dna";
import { InkRule } from "@/components/ink/marks";
import { RequireCompany } from "@/components/shell/require-company";
import { Button } from "@/components/ui/button";
import { DEMO_COMPANY_ID, SHOWCASE_COMPANY_ID } from "@/lib/guest-workspace";
import { writeArenaDraft } from "@/lib/drafts";
import type { Assumption, BrainDossierPage, Company, Fact } from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatReadDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

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
  const isShowcase = company.id === SHOWCASE_COMPANY_ID;
  const coverage = company.sources.flatMap((source) => source.pages ?? []);
  const dossier = brain.dossier ?? [];

  function takeToArena(question: string, context: string) {
    writeArenaDraft({ question, context });
    const params = new URLSearchParams({ q: question });
    if (context) params.set("c", context);
    router.push(`/arena?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:py-10">
      {isDemo ? (
        <p className="type-eyebrow mb-6 text-ochre">
          Sample data — a fictional company, for demonstration
        </p>
      ) : null}
      {isShowcase ? (
        <p className="type-eyebrow mb-6 text-graphite">
          Public floor · {company.name}
          {company.github ? " · kiaan-mittal/indieterminal" : ""}. Sign in to load your own repo.
        </p>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">Company Brain</p>
          <h1 className="type-display mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-none">
            {company.name}
          </h1>
        </div>
        <Button asChild size="lg" className="h-11 px-6 text-[15px]">
          <Link href="/arena">Take a decision into the Arena</Link>
        </Button>
      </header>

      <div className="mt-6">
        <CompanyDna company={company} onOpen={takeToArena} />
      </div>

      <div className="mt-6 max-w-[62ch]">
        <p className="text-[17px] leading-relaxed text-ink">{brain.headline}</p>
        <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-graphite">
          {brain.summary}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-relaxed text-graphite">
          {company.website ? (
            <Href href={company.website}>{sourceLabel(company.website)}</Href>
          ) : null}
          {commandHref(company.website) ? (
            <Href href={commandHref(company.website)}>/command</Href>
          ) : null}
          {company.github ? (
            <Href href={company.github}>{sourceLabel(company.github)}</Href>
          ) : null}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-graphite">
          {`Sources last read ${formatReadDate(brain.generatedAt)}. GitHub and the site resync every three days.`}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {company.sources.map((source) => (
          <article key={`${source.kind}-${source.url}`} className="border border-rule bg-paper px-4 py-4">
            <p
              className={
                source.ok ? "type-eyebrow text-moss" : "type-eyebrow text-oxblood"
              }
            >
              {source.ok ? "read" : "failed"}
            </p>
            <p className="type-figure mt-2 truncate text-[12px] text-ink">
              <Href href={source.url}>{sourceLabel(source.url)}</Href>
            </p>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-graphite">
              {source.detail}
            </p>
          </article>
        ))}
        {brain.gaps.length ? (
          <article className="border border-ochre bg-ochre-wash px-4 py-4">
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
          <article className="border border-rule bg-paper px-4 py-4">
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
          {company.website || company.github ? (
            <Line label="Live">
              {company.website ? (
                <Href href={company.website}>{sourceLabel(company.website)}</Href>
              ) : null}
              {commandHref(company.website) ? (
                <>
                  {" · "}
                  <Href href={commandHref(company.website)}>
                    /command
                  </Href>
                </>
              ) : null}
              {company.github ? (
                <>
                  {" · "}
                  <Href href={company.github}>{sourceLabel(company.github)}</Href>
                </>
              ) : null}
            </Line>
          ) : null}
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

function commandHref(website?: string) {
  if (!website || !/indieterminal\.com/i.test(website)) return "";
  return `${website.replace(/\/$/, "")}/command`;
}

function Href({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
    >
      {children}
    </a>
  );
}

function sourceLabel(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "github.com") {
      return parsed.pathname.replace(/^\/|\/$/g, "") || host;
    }
    return `${host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function citeProvenance(kind: string, ref?: string) {
  if (!ref) return kind;
  try {
    const url = new URL(ref);
    if (url.hostname.replace(/^www\./, "") === "github.com") {
      return `${kind} · ${url.pathname.replace(/^\/|\/$/g, "")}`;
    }
    return `${kind} · ${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return `${kind} · ${ref}`;
  }
}

function DossierCard({ page }: { page: BrainDossierPage }) {
  return (
    <li className="border border-rule bg-leaf px-5 py-4">
      <p className="type-eyebrow">{page.role}</p>
      <p className="mt-2 text-[15px] font-medium leading-snug text-ink">
        <Href href={page.url}>{page.title}</Href>
      </p>
      <p className="type-figure mt-1 truncate text-[12px] text-graphite">
        <Href href={page.url}>{page.url}</Href>
      </p>
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-graphite">
        {page.excerpt}
      </p>
    </li>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  const ref = fact.provenance.ref;
  const cited = citeProvenance(fact.provenance.kind, ref);
  const linked = Boolean(ref && /^https?:\/\//i.test(ref));
  return (
    <li className="border border-rule bg-leaf px-5 py-4">
      <p className="text-[15px] leading-relaxed text-ink">{fact.statement}</p>
      {fact.provenance.quote ? (
        <p className="type-display mt-2.5 text-[15px] leading-snug text-graphite">
          &ldquo;{fact.provenance.quote}&rdquo;
        </p>
      ) : null}
      <p className="type-eyebrow mt-2 truncate">
        {linked && ref ? <Href href={ref}>{cited}</Href> : cited}
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
