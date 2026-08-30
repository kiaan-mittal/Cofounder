import { detectPatterns } from "@/lib/calibration";
import type {
  Argument,
  Company,
  Contradiction,
  Decision,
  Evidence,
  Outcome,
  Prediction,
  Risk,
} from "@/lib/types";

/**
 * A worked example.
 *
 * Calibration only becomes interesting after several predictions have met
 * reality, which takes months. This seed is a founder eighteen months in, so
 * the pattern-driven half of the product can be seen immediately.
 *
 * It is clearly labelled as sample data everywhere it appears. Nothing here is
 * presented as a real company.
 */

const COMPANY_ID = "co_worked_example";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const DEMO_COMPANY: Company = {
  id: COMPANY_ID,
  name: "Kettle",
  website: "https://kettle.example",
  github: "https://github.com/kettle-dev/kettle",
  createdAt: daysAgo(420),
  sources: [
    {
      kind: "website",
      url: "https://kettle.example",
      ok: true,
      detail: "Sample data — homepage, pricing, docs and changelog.",
      pages: [
        { url: "https://kettle.example", title: "Kettle", role: "home" },
        { url: "https://kettle.example/pricing", title: "Pricing", role: "pricing" },
        { url: "https://kettle.example/docs", title: "Docs", role: "docs" },
        { url: "https://kettle.example/changelog", title: "Changelog", role: "changelog" },
      ],
    },
    {
      kind: "github",
      url: "https://github.com/kettle-dev/kettle",
      ok: true,
      detail: "Sample data — README, package.json, issues and releases.",
      files: ["package.json", "CHANGELOG.md"],
      pages: [
        {
          url: "https://github.com/kettle-dev/kettle",
          title: "kettle-dev/kettle",
          role: "repository",
        },
        {
          url: "https://github.com/kettle-dev/kettle/blob/main/package.json",
          title: "package.json",
          role: "file",
        },
      ],
    },
  ],
  brain: {
    headline:
      "Kettle is an open-source local-first sync engine for developers building offline-capable apps.",
    summary:
      "Kettle gives developers a drop-in replacement for their data layer that keeps a local SQLite copy in sync with a hosted Postgres. It is positioned against building conflict resolution by hand, and against heavier platforms that require adopting a whole backend. The repository is the product's centre of gravity: adoption comes through the open-source core, and revenue is meant to come from a hosted sync service that is still in private beta.",
    product: {
      name: "Kettle",
      description:
        "A local-first sync engine: an embedded SQLite store, a change-tracking protocol, and a hosted relay that resolves conflicts and fans updates out to other clients.",
      features: [
        "Embedded SQLite with automatic change tracking",
        "Last-writer-wins and custom conflict resolvers",
        "TypeScript and Swift client SDKs",
        "Self-hostable relay",
        "Hosted relay in private beta",
      ],
      maturity: "beta",
      roadmapSignals: [
        "Recent commits are concentrated in the hosted relay's billing module",
        "An open issue titled 'Postgres logical replication path' has 34 reactions",
        "The Swift SDK has not been touched in four months",
      ],
    },
    market: {
      icp: "Solo developers and small teams shipping offline-capable mobile or desktop apps, who have already tried to write sync themselves and abandoned it.",
      problems: [
        "Hand-rolled sync breaks in ways that are hard to reproduce",
        "Existing platforms require adopting an entire backend",
        "Offline conflict resolution is unglamorous work nobody wants to own",
      ],
      positioning:
        "The sync layer you would have written, if you had six months and wanted to.",
      alternatives: [
        "Writing sync by hand",
        "Firebase / Supabase realtime",
        "ElectricSQL",
        "Replicache",
      ],
      pricing: "Hosted relay: $29/month per project, published on the pricing page as 'coming soon'.",
    },
    technical: {
      stack: ["TypeScript", "Rust", "SQLite", "Postgres", "Swift"],
      architectureNotes:
        "The core protocol is Rust compiled to both a native library and WASM. Clients are thin bindings over it. The hosted relay is a separate TypeScript service that speaks the same protocol and holds the conflict-resolution logic.",
      repoStructure: [
        "crates/",
        "packages/client-ts/",
        "packages/client-swift/",
        "relay/",
        "examples/",
        "docs/",
      ],
      activitySignals: [
        "412 commits in the last 90 days, 88% from one author",
        "61 open issues, median age 41 days",
        "2.4k stars, 140 forks",
      ],
    },
    facts: [
      {
        id: "fact_demo01",
        statement:
          "The pricing page lists the hosted relay at $29/month per project and marks it 'coming soon'.",
        provenance: {
          kind: "website",
          ref: "https://kettle.example/pricing",
          quote: "Hosted relay — $29/mo per project. Coming soon.",
        },
      },
      {
        id: "fact_demo02",
        statement:
          "The README positions Kettle against writing sync by hand rather than against other sync platforms.",
        provenance: {
          kind: "github",
          ref: "README.md",
          quote:
            "You could write this yourself. We did, three times, and we do not recommend it.",
        },
      },
      {
        id: "fact_demo03",
        statement:
          "88% of commits in the last 90 days come from a single author.",
        provenance: { kind: "github", ref: "commit history" },
      },
      {
        id: "fact_demo04",
        statement:
          "The Swift SDK has had no commits in four months, while the TypeScript client has had 96.",
        provenance: { kind: "github", ref: "packages/client-swift/" },
      },
      {
        id: "fact_demo05",
        statement:
          "The landing page's only call to action is 'Read the docs'; there is no signup form.",
        provenance: {
          kind: "website",
          ref: "https://kettle.example",
          quote: "Read the docs",
        },
      },
    ],
    assumptions: [
      {
        id: "asm_demo01",
        statement:
          "Developers who adopt the open-source core will pay $29/month for the hosted relay rather than self-host it.",
        rationale:
          "The whole revenue model rests on this, but the relay is explicitly self-hostable and the audience is developers who enjoy self-hosting.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_demo02",
        statement:
          "GitHub stars are a leading indicator of hosted-relay demand.",
        rationale:
          "Growth reporting in past decisions has used stars as the headline number, with no conversion data behind it.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_demo03",
        statement:
          "Mobile developers are a core audience worth maintaining a Swift SDK for.",
        rationale:
          "The SDK exists and is advertised, but has been unmaintained for four months without complaint.",
        risk: "medium",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_demo04",
        statement:
          "The bottleneck on revenue is product readiness rather than distribution.",
        rationale:
          "Every previous decision has resolved toward building more, and there is no acquisition channel on the site.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
    ],
    openQuestions: [
      "How many of the 2.4k stars have ever run the relay?",
      "What happens to the Swift SDK if it stays unmaintained?",
      "Is there a single paying user today?",
    ],
    degraded: false,
    gaps: [
      "No analytics or revenue data was provided, so all demand claims are inferred from public signals.",
    ],
    generatedAt: daysAgo(420),
  },
};

const decisions: Decision[] = [
  {
    id: "dec_demo01",
    companyId: COMPANY_ID,
    question: "Should we rewrite the core protocol in Rust before launching?",
    context:
      "The TypeScript prototype worked but was too slow on large datasets.",
    options: [
      { id: "opt_a", label: "Rewrite in Rust first", detail: "Delay launch by roughly six weeks." },
      { id: "opt_b", label: "Launch on the TypeScript core", detail: "Rewrite later, under load." },
    ],
    status: "committed",
    founderConfidence: 78,
    agentConfidence: 71,
    chosenOptionId: "opt_a",
    commitmentRationale:
      "The rewrite is bounded and the performance ceiling was going to force it within the year anyway.",
    round: 2,
    createdAt: daysAgo(310),
    committedAt: daysAgo(308),
  },
  {
    id: "dec_demo02",
    companyId: COMPANY_ID,
    question: "Should we open-source the relay or keep it proprietary?",
    context:
      "The relay is the only thing we could charge for, but keeping it closed undercuts the open-source positioning.",
    options: [
      { id: "opt_a", label: "Open-source the relay", detail: "Bet on hosting convenience for revenue." },
      { id: "opt_b", label: "Keep the relay closed", detail: "Protect the only billable component." },
    ],
    status: "committed",
    founderConfidence: 62,
    agentConfidence: 48,
    chosenOptionId: "opt_a",
    commitmentRationale:
      "Credibility with this audience is worth more than the moat, and the moat was thin anyway.",
    round: 3,
    createdAt: daysAgo(210),
    committedAt: daysAgo(206),
  },
  {
    id: "dec_demo03",
    companyId: COMPANY_ID,
    question: "Should we run a Show HN launch this month?",
    context: "The docs are good but the hosted relay is still invite-only.",
    options: [
      { id: "opt_a", label: "Launch this month", detail: "Take the traffic now." },
      { id: "opt_b", label: "Wait for the hosted relay", detail: "Launch with something to sell." },
    ],
    status: "committed",
    founderConfidence: 84,
    agentConfidence: 55,
    chosenOptionId: "opt_a",
    commitmentRationale: "Attention now compounds; the relay can follow.",
    round: 2,
    createdAt: daysAgo(120),
    committedAt: daysAgo(118),
  },
  {
    id: "dec_demo04",
    companyId: COMPANY_ID,
    question: "Should we hire a part-time developer advocate?",
    context: "Support load is eating the mornings.",
    options: [
      { id: "opt_a", label: "Hire part-time", detail: "About £2k/month against 9 months of runway." },
      { id: "opt_b", label: "Stay solo", detail: "Automate support instead." },
    ],
    status: "investigating",
    founderConfidence: 45,
    agentConfidence: 38,
    round: 1,
    createdAt: daysAgo(64),
  },
  {
    id: "dec_demo05",
    companyId: COMPANY_ID,
    question: "Should we drop the Swift SDK?",
    context: "It has been unmaintained for months and nobody has complained.",
    options: [
      { id: "opt_a", label: "Drop it", detail: "Archive it and say so publicly." },
      { id: "opt_b", label: "Keep maintaining it", detail: "Roughly a week a quarter." },
    ],
    status: "abandoned",
    founderConfidence: 40,
    agentConfidence: 66,
    round: 1,
    createdAt: daysAgo(38),
  },
  {
    id: "dec_live",
    companyId: COMPANY_ID,
    question:
      "Should we launch the hosted relay now, or spend another month on polish?",
    context:
      "The billing module works end to end. Nine months of runway left. The Show HN traffic from May is cold but the waitlist is still there.",
    options: [
      {
        id: "opt_now",
        label: "Launch now",
        detail: "Open the hosted relay to the waitlist this month, rough edges included.",
      },
      {
        id: "opt_polish",
        label: "Another month of polish",
        detail: "Harden the relay, finish the migration path, then open it.",
      },
    ],
    status: "open",
    founderConfidence: 72,
    agentConfidence: 44,
    round: 1,
    createdAt: daysAgo(1),
  },
];

/**
 * A round already argued, so the Arena can be read without model credentials.
 *
 * These are the same shapes the debate engine produces at runtime — the five
 * perspectives, each grounded in a fact or an assumption from the Brain or in
 * a measured pattern from the founder's record.
 */
const argumentList: Argument[] = [
  {
    id: "arg_live01",
    decisionId: "dec_live",
    perspective: "technical",
    stance: "for",
    claim:
      "The relay is not the risky part; one person maintaining it is.",
    reasoning:
      "412 commits in 90 days, 88% from a single author. Another month of polish does not change the bus factor, and it is the bus factor that will break a paid service, not the rough edges.",
    basis: [
      { type: "fact", ref: "fact_demo03", label: "88% of commits from one author" },
    ],
    strength: 68,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_live02",
    decisionId: "dec_live",
    perspective: "product",
    stance: "conditional",
    claim:
      "Nobody has told you which rough edges matter, because nobody has paid yet.",
    reasoning:
      "A month of polish chosen by the person who wrote the code optimises for the defects that annoy the author. Launching to the waitlist gives you a defect list ordered by people with money at stake.",
    basis: [
      {
        type: "assumption",
        ref: "asm_demo04",
        label: "The bottleneck is product readiness, not distribution",
      },
    ],
    strength: 74,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_live03",
    decisionId: "dec_live",
    perspective: "gtm",
    stance: "against",
    claim:
      "You already ran this experiment in May and it failed for a reason polish will not fix.",
    reasoning:
      "The Show HN reached the front page, drove 520 signups, and converted nobody, because there was nothing to buy. Launching again into a colder audience without fixing the asking-for-money problem repeats the same move with less attention.",
    basis: [
      {
        type: "pattern",
        label: "Distribution estimates 2.8× optimistic across 2 outcomes",
      },
    ],
    strength: 81,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_live04",
    decisionId: "dec_live",
    perspective: "financial",
    stance: "for",
    claim:
      "A month of polish costs about 11% of your remaining runway and returns no information.",
    reasoning:
      "Nine months left, no paying user, and the price has been published as 'coming soon' for two quarters. The cheapest thing you can buy right now is the answer to whether anyone pays $29 — and only launching buys it.",
    basis: [
      { type: "fact", ref: "fact_demo01", label: "$29/mo relay listed as coming soon" },
    ],
    strength: 77,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_live05",
    decisionId: "dec_live",
    perspective: "contrarian",
    stance: "against",
    claim:
      "Both options assume the hosted relay is the product. Your own README argues against paying for it.",
    reasoning:
      "You tell developers they could write this themselves and that the relay is self-hostable, to an audience that enjoys self-hosting. Neither launching nor polishing tests the assumption that this audience will ever rent what you have taught them to run.",
    basis: [
      {
        type: "assumption",
        ref: "asm_demo01",
        label: "Developers will pay for the hosted relay rather than self-host",
      },
    ],
    strength: 86,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
];

const risks: Risk[] = [
  {
    id: "risk_live01",
    decisionId: "dec_live",
    title: "Launching to a cold list a second time",
    detail:
      "The May waitlist has had no contact in three months. A launch that reaches the same people with the same ask is likely to convert worse, not better.",
    severity: 4,
    likelihood: "high",
    status: "open",
    perspective: "gtm",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "risk_live02",
    decisionId: "dec_live",
    title: "One maintainer on a paid service",
    detail:
      "Once someone is paying, an outage becomes an obligation. There is currently no second person who can restore the relay.",
    severity: 4,
    likelihood: "medium",
    status: "open",
    perspective: "technical",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "risk_live03",
    decisionId: "dec_live",
    title: "Polish becomes another month, then another",
    detail:
      "Two previous decisions resolved toward building more. Nothing in this decision defines what 'polished enough' means, so there is no test that ends it.",
    severity: 3,
    likelihood: "high",
    status: "open",
    perspective: "product",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
];

const contradictions: Contradiction[] = [
  {
    id: "con_live01",
    decisionId: "dec_live",
    summary:
      "You are treating product readiness as the constraint, but your own recorded lesson says it never was.",
    sideA:
      "This decision assumes another month of polish is what stands between you and revenue.",
    sideB:
      "After the Show HN you wrote: 'The constraint was never product readiness; it was that no one was ever asked to pay.'",
    resolved: false,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
];

const evidence: Evidence[] = [
  {
    id: "ev_live01",
    decisionId: "dec_live",
    statement:
      "How many of the 520 waitlist signups have opened anything from you in the last 60 days?",
    status: "requested",
    requestedBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "ev_live02",
    decisionId: "dec_live",
    statement:
      "Has any single person ever said, in writing, that they would pay $29/month for the hosted relay?",
    status: "requested",
    requestedBy: "arena",
    createdAt: daysAgo(1),
  },
];

const predictions: Prediction[] = [
  {
    id: "pred_demo01",
    decisionId: "dec_demo01",
    companyId: COMPANY_ID,
    statement: "The Rust rewrite lands in 14 days.",
    domain: "technical",
    metric: "days to ship the rewrite",
    expectedValue: 14,
    unit: "days",
    deadline: daysAgo(294),
    confidence: 70,
    status: "hit",
    actualValue: 15,
    ratio: 14 / 15,
    evaluatedAt: daysAgo(293),
    createdBy: "founder",
    createdAt: daysAgo(308),
  },
  {
    id: "pred_demo02",
    decisionId: "dec_demo01",
    companyId: COMPANY_ID,
    statement: "500 GitHub stars within 30 days of the rewrite landing.",
    domain: "growth",
    metric: "GitHub stars",
    expectedValue: 500,
    unit: "stars",
    deadline: daysAgo(264),
    confidence: 65,
    status: "missed",
    actualValue: 240,
    ratio: 500 / 240,
    evaluatedAt: daysAgo(263),
    createdBy: "founder",
    createdAt: daysAgo(308),
  },
  {
    id: "pred_demo03",
    decisionId: "dec_demo02",
    companyId: COMPANY_ID,
    statement: "12 teams become design partners for the hosted relay in 60 days.",
    domain: "distribution",
    metric: "design partners",
    expectedValue: 12,
    unit: "teams",
    deadline: daysAgo(146),
    confidence: 60,
    status: "missed",
    actualValue: 4,
    ratio: 3,
    evaluatedAt: daysAgo(145),
    createdBy: "founder",
    createdAt: daysAgo(206),
  },
  {
    id: "pred_demo04",
    decisionId: "dec_demo02",
    companyId: COMPANY_ID,
    statement: "The relay refactor takes three weeks.",
    domain: "technical",
    metric: "days to refactor the relay",
    expectedValue: 21,
    unit: "days",
    deadline: daysAgo(185),
    confidence: 75,
    status: "hit",
    actualValue: 20,
    ratio: 21 / 20,
    evaluatedAt: daysAgo(184),
    createdBy: "founder",
    createdAt: daysAgo(206),
  },
  {
    id: "pred_demo05",
    decisionId: "dec_demo03",
    companyId: COMPANY_ID,
    statement: "200 hosted-relay signups within 30 days of the Show HN.",
    domain: "growth",
    metric: "hosted relay signups",
    expectedValue: 200,
    unit: "signups",
    deadline: daysAgo(88),
    confidence: 80,
    status: "missed",
    actualValue: 95,
    ratio: 200 / 95,
    evaluatedAt: daysAgo(87),
    createdBy: "founder",
    createdAt: daysAgo(118),
  },
  {
    id: "pred_demo06",
    decisionId: "dec_demo03",
    companyId: COMPANY_ID,
    statement: "1,000 people on the waitlist within 30 days.",
    domain: "growth",
    metric: "waitlist signups",
    expectedValue: 1000,
    unit: "people",
    deadline: daysAgo(88),
    confidence: 70,
    status: "missed",
    actualValue: 520,
    ratio: 1000 / 520,
    evaluatedAt: daysAgo(87),
    createdBy: "founder",
    createdAt: daysAgo(118),
  },
  {
    id: "pred_demo07",
    decisionId: "dec_demo03",
    companyId: COMPANY_ID,
    statement: "8 inbound blog mentions in 30 days.",
    domain: "distribution",
    metric: "inbound mentions",
    expectedValue: 8,
    unit: "mentions",
    deadline: daysAgo(88),
    confidence: 55,
    status: "missed",
    actualValue: 3,
    ratio: 8 / 3,
    evaluatedAt: daysAgo(87),
    createdBy: "founder",
    createdAt: daysAgo(118),
  },
  {
    id: "pred_demo08",
    decisionId: "dec_demo03",
    companyId: COMPANY_ID,
    statement: "The invite flow takes 5 days to build.",
    domain: "technical",
    metric: "days to build the invite flow",
    expectedValue: 5,
    unit: "days",
    deadline: daysAgo(112),
    confidence: 85,
    status: "partial",
    actualValue: 6,
    ratio: 5 / 6,
    evaluatedAt: daysAgo(111),
    createdBy: "founder",
    createdAt: daysAgo(118),
  },
];

const outcomes: Outcome[] = [
  {
    id: "out_demo01",
    decisionId: "dec_demo01",
    result: "succeeded",
    summary:
      "The rewrite shipped in 15 days and removed the performance ceiling. Star growth from it was less than half what was expected.",
    lesson:
      "Engineering estimates here are trustworthy. The growth number attached to a technical milestone was not — shipping something faster did not make anyone hear about it.",
    recordedAt: daysAgo(262),
  },
  {
    id: "out_demo02",
    decisionId: "dec_demo02",
    result: "mixed",
    summary:
      "Open-sourcing the relay was well received and cost nothing in credibility, but only 4 of the 12 expected design partners materialised, and none converted to paid.",
    lesson:
      "Goodwill from the open-source audience does not convert into commercial commitment on its own. Nothing was ever asked of the people who starred the repo.",
    recordedAt: daysAgo(144),
  },
  {
    id: "out_demo03",
    decisionId: "dec_demo03",
    result: "failed",
    summary:
      "The Show HN reached the front page and drove 520 waitlist signups, roughly half the prediction, and 95 hosted-relay signups against 200 expected. There was nothing to buy when the traffic arrived.",
    lesson:
      "Launching before there is something to convert into turns a distribution win into a list. The constraint was never product readiness; it was that no one was ever asked to pay.",
    recordedAt: daysAgo(86),
  },
];

export function demoSnapshot() {
  return {
    company: DEMO_COMPANY,
    decisions,
    predictions,
    outcomes,
    patterns: detectPatterns(COMPANY_ID, predictions, decisions),
    argumentList,
    defenses: [],
    reassessments: [],
    risks,
    evidence,
    contradictions,
    actionItems: [],
    toolCalls: [],
    activeDecisionId: "dec_live",
    spotlightId: null,
    pendingCommit: null,
  };
}

export const DEMO_COMPANY_ID = COMPANY_ID;
