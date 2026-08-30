import "server-only";

import { z } from "zod";

import { id, now } from "@/lib/id";
import type { CompanyBrain } from "@/lib/types";
import type { GithubSource, WebsiteSource } from "@/server/ingest";
import { generateStructured, untrusted } from "@/server/llm";

const SOURCE_KINDS = [
  "website",
  "github",
  "docs",
  "founder",
  "inferred",
] as const;
const MATURITIES = [
  "prototype",
  "alpha",
  "beta",
  "launched",
  "unclear",
] as const;
const RISKS = ["low", "medium", "high"] as const;

const provenanceSchema = z.object({
  kind: z.enum(SOURCE_KINDS),
  ref: z.string().optional(),
  quote: z.string().optional(),
});

const brainSchema = z.object({
  companyName: z.string(),
  headline: z.string(),
  summary: z.string(),
  product: z.object({
    name: z.string(),
    description: z.string(),
    features: z.array(z.string()),
    maturity: z.enum(MATURITIES),
    roadmapSignals: z.array(z.string()),
  }),
  market: z.object({
    icp: z.string(),
    problems: z.array(z.string()),
    positioning: z.string(),
    alternatives: z.array(z.string()),
    pricing: z.string().nullable(),
  }),
  technical: z.object({
    stack: z.array(z.string()),
    architectureNotes: z.string(),
    repoStructure: z.array(z.string()),
    activitySignals: z.array(z.string()),
  }),
  facts: z.array(
    z.object({
      statement: z.string(),
      provenance: provenanceSchema,
    }),
  ),
  assumptions: z.array(
    z.object({
      statement: z.string(),
      rationale: z.string(),
      risk: z.enum(RISKS),
      provenance: provenanceSchema,
    }),
  ),
  openQuestions: z.array(z.string()),
  gaps: z.array(z.string()),
});

type BrainDraft = z.infer<typeof brainSchema>;

const SYSTEM = `You build the Company Brain for Decision Arena: a checkable model of a real company, assembled only from the public pages and repository files the founder provided.

Your single most important job is to separate what is KNOWN from what is BELIEVED.

A FACT is something a source states. It must be traceable, with a short verbatim quote and the page or file it came from. Prefer specifics: prices, stack, customer claims, shipping dates, open issues, hiring signals. "The pricing page lists a $49/month Pro tier" is a fact. "The README says TypeScript and Postgres" is a fact.

An ASSUMPTION is a belief the company is acting on that the sources do not establish. "Solo developers will pay $49/month" is an assumption. "The rewrite is worth the delay" is an assumption. Assumptions are what the Arena will later attack, so make them sharp, specific and falsifiable — never vague platitudes.

Use every page you were given — homepage, pricing, about, docs, changelog, issues, stack files. Do not ignore a pricing page or an open issue. Never present an inference as a fact. If a topic is missing after a multi-page read, say so in gaps. Always return facts and assumptions as arrays. Write in plain, specific, unhedged prose, using the company's own vocabulary.`;

export function buildBrainPrompt(sources: {
  website: WebsiteSource | null;
  github: GithubSource | null;
}): string {
  const parts: string[] = [];

  if (sources.website) {
    const site = sources.website;
    const pageBlocks =
      site.pages.length > 0
        ? site.pages
            .map(
              (page) =>
                `--- ${page.role.toUpperCase()} ${page.url} ---\nTitle: ${page.title}\nHeadings: ${page.headings.slice(0, 12).join(" | ")}\n${page.text.slice(0, page.role === "pricing" ? 6_000 : 2_800)}`,
            )
            .join("\n\n")
        : `Page copy: ${site.text.slice(0, 5000)}`;

    parts.push(
      untrusted(
        "website pages",
        [
          `Primary URL: ${site.url}`,
          `Title: ${site.title}`,
          `Meta description: ${site.description}`,
          `Calls to action: ${site.ctas.join(" | ")}`,
          site.pricingText
            ? `Pricing region: ${site.pricingText}`
            : "Pricing region: none found",
          `Pages read: ${site.pages.map((page) => `${page.role} (${page.url})`).join(", ") || "homepage only"}`,
          pageBlocks,
        ].join("\n"),
      ),
    );
  } else {
    parts.push("No website content is available for this company.");
  }

  if (sources.github) {
    const g = sources.github;
    const fileBlocks = g.files
      .map((file) => `--- FILE ${file.path} ---\n${file.text.slice(0, 1800)}`)
      .join("\n\n");

    parts.push(
      untrusted(
        "github repository",
        [
          `Repository: ${g.owner}/${g.repo} (${g.url})`,
          `Description: ${g.description}`,
          `Homepage: ${g.homepage ?? "none"}`,
          `Topics: ${g.topics.join(", ")}`,
          `Stars: ${g.stars} | Forks: ${g.forks} | Open issues: ${g.openIssues}`,
          `License: ${g.license ?? "none declared"}`,
          `Default branch: ${g.defaultBranch}`,
          `Created: ${g.createdAt} | Last push: ${g.pushedAt}`,
          `Languages: ${g.languages.join(", ")}`,
          `Contributors: ${g.contributors.join(", ") || "unknown"}`,
          `Root entries: ${g.tree.join(", ")}`,
          `Recent commits:\n${g.recentCommits.join("\n")}`,
          g.issues.length ? `Open issues:\n${g.issues.join("\n")}` : "Open issues: none read",
          g.releases.length
            ? `Releases:\n${g.releases.join("\n")}`
            : "Releases: none published or none read",
          `README:\n${g.readme.slice(0, 3500)}`,
          fileBlocks || "No additional stack files were readable.",
        ].join("\n"),
      ),
    );
  } else {
    parts.push("No repository content is available for this company.");
  }

  parts.push(
    "Build the Company Brain from every page and file above. Include companyName, headline, summary, product, market, technical, facts (as many specific checkable ones as the sources support, up to 16), assumptions (the bets the company is making, up to 12), openQuestions and gaps. Quote the sources for facts. Name the assumptions the company is betting on.",
  );

  return parts.join("\n\n");
}

export async function generateCompanyBrain(sources: {
  website: WebsiteSource | null;
  github: GithubSource | null;
}): Promise<{ brain: CompanyBrain; companyName: string }> {
  const raw = await generateStructured({
    schema: brainSchema,
    system: SYSTEM,
    prompt: buildBrainPrompt(sources),
    purpose: "Building the Company Brain",
    schemaName: "CompanyBrain",
    normalize: normalizeBrainDraft,
    // Structured extraction does not need the slowest model. Debate can.
    models: [
      process.env.OPENAI_FAST_MODEL?.trim() || "gpt-4o",
      process.env.OPENAI_FALLBACK_MODEL?.trim() || "gpt-4.1",
      process.env.OPENAI_MODEL?.trim() || "gpt-4o",
    ].filter((model, index, list) => list.indexOf(model) === index),
  });

  const facts =
    raw.facts.length > 0 ? raw.facts : seedFacts(sources);
  const assumptions =
    raw.assumptions.length > 0 ? raw.assumptions : seedAssumptions(sources);

  const degraded = !sources.website || !sources.github;
  const gaps = [...raw.gaps];
  if (!sources.website) gaps.unshift("The website could not be read.");
  if (!sources.github) gaps.unshift("The repository could not be read.");

  const brain: CompanyBrain = {
    headline: raw.headline || raw.companyName || "Untitled company",
    summary: raw.summary,
    product: {
      ...raw.product,
      features: raw.product.features.slice(0, 10),
      roadmapSignals: raw.product.roadmapSignals.slice(0, 6),
    },
    market: {
      ...raw.market,
      problems: raw.market.problems.slice(0, 6),
      alternatives: raw.market.alternatives.slice(0, 6),
    },
    technical: {
      ...raw.technical,
      stack: raw.technical.stack.slice(0, 14),
      repoStructure: raw.technical.repoStructure.slice(0, 12),
      activitySignals: raw.technical.activitySignals.slice(0, 6),
    },
    facts: facts.slice(0, 16).map((fact) => ({
      id: id("fact"),
      statement: fact.statement,
      provenance: fact.provenance,
    })),
    assumptions: assumptions.slice(0, 12).map((assumption) => ({
      id: id("asm"),
      statement: assumption.statement,
      rationale: assumption.rationale,
      risk: assumption.risk,
      status: "unverified",
      provenance: assumption.provenance,
    })),
    openQuestions: raw.openQuestions.slice(0, 6),
    degraded,
    gaps: gaps.slice(0, 8),
    generatedAt: now(),
  };

  return {
    brain,
    companyName:
      raw.companyName ||
      sources.website?.title ||
      sources.github?.repo ||
      "Untitled company",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .map((item) => item.trim())
    .filter(Boolean);
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function asProvenance(value: unknown): BrainDraft["facts"][number]["provenance"] {
  const record = asRecord(value);
  return {
    kind: asEnum(record.kind, SOURCE_KINDS, "inferred"),
    ...(asString(record.ref) ? { ref: asString(record.ref) } : {}),
    ...(asString(record.quote) ? { quote: asString(record.quote) } : {}),
  };
}

/** Turn a near-miss model payload into a schema-valid Company Brain draft. */
export function normalizeBrainDraft(value: unknown): BrainDraft {
  const record = asRecord(value);
  const product = asRecord(record.product);
  const market = asRecord(record.market);
  const technical = asRecord(record.technical);
  const companyName = asString(
    record.companyName ?? record.name,
    "Untitled company",
  );

  return {
    companyName,
    headline: asString(record.headline, companyName),
    summary: asString(record.summary),
    product: {
      name: asString(product.name, companyName),
      description: asString(product.description, asString(record.summary)),
      features: asStringList(product.features),
      maturity: asEnum(product.maturity, MATURITIES, "unclear"),
      roadmapSignals: asStringList(product.roadmapSignals),
    },
    market: {
      icp: asString(market.icp),
      problems: asStringList(market.problems),
      positioning: asString(market.positioning),
      alternatives: asStringList(market.alternatives),
      pricing: typeof market.pricing === "string" ? market.pricing : null,
    },
    technical: {
      stack: asStringList(technical.stack),
      architectureNotes: asString(technical.architectureNotes),
      repoStructure: asStringList(technical.repoStructure),
      activitySignals: asStringList(technical.activitySignals),
    },
    facts: (Array.isArray(record.facts) ? record.facts : [])
      .map((item) => {
        const fact = asRecord(item);
        const statement = asString(fact.statement);
        if (!statement) return null;
        return { statement, provenance: asProvenance(fact.provenance) };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    assumptions: (Array.isArray(record.assumptions) ? record.assumptions : [])
      .map((item) => {
        const assumption = asRecord(item);
        const statement = asString(assumption.statement);
        if (!statement) return null;
        return {
          statement,
          rationale: asString(assumption.rationale),
          risk: asEnum(assumption.risk, RISKS, "medium"),
          provenance: asProvenance(assumption.provenance),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    openQuestions: asStringList(record.openQuestions),
    gaps: asStringList(record.gaps),
  };
}

function seedFacts(sources: {
  website: WebsiteSource | null;
  github: GithubSource | null;
}): BrainDraft["facts"] {
  const facts: BrainDraft["facts"] = [];

  if (sources.website) {
    const site = sources.website;
    if (site.title) {
      facts.push({
        statement: `The public site is titled “${site.title}”.`,
        provenance: { kind: "website", ref: site.url, quote: site.title },
      });
    }
    if (site.description) {
      facts.push({
        statement: `The site describes itself as: ${site.description}`,
        provenance: {
          kind: "website",
          ref: site.url,
          quote: site.description,
        },
      });
    }
    if (site.headings[0]) {
      facts.push({
        statement: `A primary heading on the site is “${site.headings[0]}”.`,
        provenance: {
          kind: "website",
          ref: site.url,
          quote: site.headings[0],
        },
      });
    }
    if (site.pricingText) {
      facts.push({
        statement: "The site publishes pricing information.",
        provenance: {
          kind: "website",
          ref: site.url,
          quote: site.pricingText.slice(0, 240),
        },
      });
    }
    for (const page of site.pages.slice(0, 4)) {
      if (page.role === "home" || !page.headings[0]) continue;
      facts.push({
        statement: `The ${page.role} page leads with “${page.headings[0]}”.`,
        provenance: {
          kind: "website",
          ref: page.url,
          quote: page.headings[0],
        },
      });
    }
  }

  if (sources.github) {
    const repo = sources.github;
    facts.push({
      statement: `The repository is ${repo.owner}/${repo.repo}.`,
      provenance: {
        kind: "github",
        ref: repo.url,
        quote: repo.description || `${repo.owner}/${repo.repo}`,
      },
    });
    if (repo.languages.length) {
      facts.push({
        statement: `The repository languages include ${repo.languages.slice(0, 6).join(", ")}.`,
        provenance: {
          kind: "github",
          ref: repo.url,
          quote: repo.languages.join(", "),
        },
      });
    }
    if (repo.pushedAt) {
      facts.push({
        statement: `The repository last pushed at ${repo.pushedAt}.`,
        provenance: { kind: "github", ref: repo.url, quote: repo.pushedAt },
      });
    }
    if (repo.issues[0]) {
      facts.push({
        statement: `An open issue in the repository is “${repo.issues[0]}”.`,
        provenance: {
          kind: "github",
          ref: repo.url,
          quote: repo.issues[0],
        },
      });
    }
    if (repo.files[0]) {
      facts.push({
        statement: `The repository includes ${repo.files.map((file) => file.path).join(", ")}.`,
        provenance: {
          kind: "github",
          ref: `${repo.url}/blob/${repo.defaultBranch}/${repo.files[0].path}`,
          quote: repo.files[0].path,
        },
      });
    }
  }

  return facts.slice(0, 8);
}

function seedAssumptions(sources: {
  website: WebsiteSource | null;
  github: GithubSource | null;
}): BrainDraft["assumptions"] {
  const assumptions: BrainDraft["assumptions"] = [];

  if (sources.website) {
    assumptions.push({
      statement:
        "The public positioning on the website is what the company should keep optimizing for.",
      rationale:
        "Homepage copy is being read as the intended bet unless the founder says otherwise.",
      risk: "medium",
      provenance: { kind: "inferred", ref: sources.website.url },
    });
  }

  if (sources.github) {
    assumptions.push({
      statement:
        "The current repository stack and activity are the right technical bet for the next decision.",
      rationale:
        "Public repo structure is being read as a commitment, not just a snapshot.",
      risk: "medium",
      provenance: { kind: "inferred", ref: sources.github.url },
    });
  }

  if (!assumptions.length) {
    assumptions.push({
      statement: "The available public sources are enough to decide from.",
      rationale:
        "The Arena had little to read and is guessing more than it should.",
      risk: "high",
      provenance: { kind: "inferred" },
    });
  }

  return assumptions;
}

/**
 * A compact rendering of the Brain for use inside later debate prompts.
 * Arguments are only worth reading if they are grounded in this.
 */
export function brainDigest(brain: CompanyBrain): string {
  return [
    `COMPANY: ${brain.headline}`,
    brain.summary,
    "",
    `PRODUCT: ${brain.product.name} — ${brain.product.description}`,
    `Maturity: ${brain.product.maturity}`,
    `Features: ${brain.product.features.join("; ")}`,
    `Roadmap signals: ${brain.product.roadmapSignals.join("; ") || "none"}`,
    "",
    `ICP: ${brain.market.icp}`,
    `Positioning: ${brain.market.positioning}`,
    `Customer problems: ${brain.market.problems.join("; ")}`,
    `Alternatives: ${brain.market.alternatives.join("; ")}`,
    `Pricing: ${brain.market.pricing ?? "not published"}`,
    "",
    `STACK: ${brain.technical.stack.join(", ")}`,
    `Architecture: ${brain.technical.architectureNotes}`,
    `Repo: ${brain.technical.repoStructure.join(", ")}`,
    `Activity: ${brain.technical.activitySignals.join("; ")}`,
    "",
    "FACTS (checkable, quote these by id):",
    ...brain.facts.map((f) => `- [${f.id}] ${f.statement}`),
    "",
    "ASSUMPTIONS (unproven, attack these by id):",
    ...brain.assumptions.map(
      (a) => `- [${a.id}] (${a.risk} risk, ${a.status}) ${a.statement}`,
    ),
    "",
    brain.gaps.length ? `KNOWN GAPS: ${brain.gaps.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
