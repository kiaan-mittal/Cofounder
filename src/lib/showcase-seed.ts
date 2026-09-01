import { detectPatterns } from "@/lib/calibration";
import { SHOWCASE_COMPANY_ID as COMPANY_ID } from "@/lib/guest-workspace";
import type {
  Argument,
  Company,
  Contradiction,
  Decision,
  Evidence,
  Outcome,
  Risk,
} from "@/lib/types";

/**
 * The public judging floor.
 *
 * This is not the fictional Kettle sample. It is IndieTerminal — the company
 * the founder actually loaded locally — reconstructed from public pages so a
 * judge on the Vercel deploy sees a real Company Brain without signing into
 * the founder's GitHub account.
 *
 * Sources are public. Gaps are listed. Nothing here is presented as a private
 * workspace export.
 */

const SITE = "https://www.kiaanmittal.xyz/";
const LINKEDIN_CLICKS =
  "https://www.linkedin.com/posts/kiaan09_most-ai-startups-right-now-are-already-dead-activity-7455953857203060736-vMQv";
const LINKEDIN_YC =
  "https://www.linkedin.com/posts/kiaan09_so-y-combinator-just-hosted-their-first-startup-activity-7451516132949131265-AhYp";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const SHOWCASE_COMPANY: Company = {
  id: COMPANY_ID,
  name: "IndieTerminal",
  website: SITE,
  github: "",
  createdAt: daysAgo(180),
  sources: [
    {
      kind: "website",
      url: SITE,
      ok: true,
      detail: "Founder's public site — product status, shipped work, stack.",
      pages: [
        { url: SITE, title: "Kiaan Mittal", role: "home" },
      ],
    },
    {
      kind: "founder",
      url: LINKEDIN_CLICKS,
      ok: true,
      detail: "Public post stating what IndieTerminal is for.",
      pages: [
        {
          url: LINKEDIN_CLICKS,
          title: "Most AI startups right now are already dead.",
          role: "positioning",
        },
      ],
    },
    {
      kind: "github",
      url: "",
      ok: false,
      detail:
        "IndieTerminal has no public repository. The Brain cannot read code, issues, or commit history.",
    },
  ],
  brain: {
    headline:
      "IndieTerminal is a next-gen, AI-native terminal for developers — still in stealth, described as a company brain that lets agents act rather than chat.",
    summary:
      "The public site lists IndieTerminal as the thing currently being built: a terminal experience focused on speed, aesthetics, and AI-native workflows. A public post goes further and calls it a company brain that stores context, understands workflows, and lets agents act. There is no public repo, no pricing, and no shipped terminal to inspect. The only recent public ship with numbers is a one-day founder directory for YC Startup School Bangalore.",
    product: {
      name: "IndieTerminal",
      description:
        "Positioned as a next-generation terminal for developers, and separately as a company brain: persistent context, workflow understanding, and agents that act instead of chatting.",
      features: [
        "AI-native terminal workflows",
        "Company brain / stored context",
        "Agents that act, not just chat",
        "Speed and aesthetics as a first-class goal",
      ],
      maturity: "prototype",
      roadmapSignals: [
        "Personal site marks IndieTerminal as Active Stealth / In Progress",
        "Public writing aims at YC S26",
        "No public waitlist, docs, or download",
      ],
    },
    market: {
      icp: "Developers and early-stage founders who want agents to operate a system rather than answer in a chat.",
      problems: [
        "Existing terminals are not built around agents",
        "AI products that are 'a copilot for X' are described by the founder as replaceable",
        "Context dies between sessions unless the product stores it",
      ],
      positioning:
        "Not another AI tool — a foundation agents can use without clicks.",
      alternatives: [
        "VS Code / Cursor integrated terminals",
        "Warp, Ghostty, iTerm",
        "Claude Code / Codex CLIs in an ordinary terminal",
        "ChatGPT as the workspace",
      ],
      pricing: null,
    },
    technical: {
      stack: [
        "Next.js",
        "TypeScript",
        "React",
        "Tailwind",
        "Supabase",
        "Python",
        "Swift",
        "Cursor",
      ],
      architectureNotes:
        "The public site lists a web and iOS stack and does not describe a terminal emulator, PTY layer, or agent runtime. Without a public repository there is no evidence which of those the current build actually contains.",
      repoStructure: [],
      activitySignals: [
        "GitHub Recap '26 on the site: 396 contributions, 60+ days coded, peak day 44",
        "No public IndieTerminal repository to attribute those commits to",
      ],
    },
    facts: [
      {
        id: "fact_it01",
        statement:
          "The founder's site introduces him as a 14-year-old builder currently building IndieTerminal.",
        provenance: {
          kind: "website",
          ref: SITE,
          quote: "14 y/o builder. Currently building indieterminal",
        },
      },
      {
        id: "fact_it02",
        statement:
          "IndieTerminal is described as a next-gen terminal for developers, focused on speed, aesthetics, and AI-native workflows.",
        provenance: {
          kind: "website",
          ref: SITE,
          quote:
            "Building the next-gen terminal experience for developers. Focused on speed, aesthetics, and AI-native workflows.",
        },
      },
      {
        id: "fact_it03",
        statement:
          "The same site lists IndieTerminal as Active Stealth and In Progress.",
        provenance: {
          kind: "website",
          ref: SITE,
          quote: "Active Stealth · Status: In Progress",
        },
      },
      {
        id: "fact_it04",
        statement:
          "A public post describes IndieTerminal as a company brain that stores context, understands workflows, and lets agents act rather than chat.",
        provenance: {
          kind: "founder",
          ref: LINKEDIN_CLICKS,
          quote:
            "Not another AI tool. A company brain. Stores context. Understands workflows. Lets agents act, not just chat.",
        },
      },
      {
        id: "fact_it05",
        statement:
          "The same post argues that a product which does not work without clicks will not survive.",
        provenance: {
          kind: "founder",
          ref: LINKEDIN_CLICKS,
          quote:
            "If your product doesn’t work without clicks… it won’t survive what’s coming.",
        },
      },
      {
        id: "fact_it06",
        statement:
          "YC BLR Directory shipped in 6 hours and recorded 100+ visitors and 500+ pageviews in 12 hours.",
        provenance: {
          kind: "website",
          ref: SITE,
          quote: "100+ Visitors · in 12 hrs · 500+ Pageviews · 6 hrs Built in",
        },
      },
      {
        id: "fact_it07",
        statement:
          "There is no public GitHub repository for IndieTerminal to read.",
        provenance: {
          kind: "github",
          ref: "public search",
        },
      },
      {
        id: "fact_it08",
        statement:
          "The site lists Next.js, Swift, TypeScript, React, Tailwind, Supabase, Python and Cursor as the stack, with no IndieTerminal architecture beyond that list.",
        provenance: {
          kind: "website",
          ref: SITE,
          quote: "Next.js · Swift · TypeScript · React · Tailwind · Supabase · Python · Cursor",
        },
      },
    ],
    assumptions: [
      {
        id: "asm_it01",
        statement:
          "Developers will leave their current terminal for an AI-native one rather than stay in Cursor, Warp, or a CLI agent inside iTerm.",
        rationale:
          "The product is framed as a next-gen terminal, but the public writing is about agents using systems. Those can live inside tools people already have.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it02",
        statement:
          "“Company brain” and “next-gen terminal” are the same product.",
        rationale:
          "The site sells a terminal. The post sells a company brain. Nothing public shows they are one codebase.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it03",
        statement:
          "Staying in stealth is protecting a secret rather than delaying the first real test.",
        rationale:
          "The only numbered public ship is a directory built in a day. Stealth for the main product has produced no waitlist, no demo, and no repo.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it04",
        statement:
          "Attention from shipping small public tools will convert into IndieTerminal users later.",
        rationale:
          "YC BLR Directory proved a specific event tool can get traffic. It does not prove those visitors want a terminal.",
        risk: "medium",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
    ],
    openQuestions: [
      "Is IndieTerminal a terminal emulator, a company-brain web app, or both?",
      "Who has used any build of it besides the founder?",
      "What would a public waitlist actually put in someone's hands?",
    ],
    dossier: [
      {
        url: SITE,
        title: "Kiaan Mittal",
        role: "home",
        excerpt:
          "14 y/o builder. Currently building indieterminal. INDIETERMINAL — Building the next-gen terminal experience for developers. Focused on speed, aesthetics, and AI-native workflows. Status: In Progress. Active Stealth.",
      },
      {
        url: SITE,
        title: "YC BLR Directory",
        role: "shipped",
        excerpt:
          "Founder directory for YC Startup School Bangalore. Built for the real YC event. 100+ visitors in 12 hrs. 500+ pageviews in 12 hrs. 6 hrs built in. Shipped fast.",
      },
      {
        url: LINKEDIN_CLICKS,
        title: "Most AI startups right now are already dead.",
        role: "positioning",
        excerpt:
          "We’re building IndieTerminal differently. Not another AI tool. A company brain. Stores context. Understands workflows. Lets agents act, not just chat. If your product doesn’t work without clicks… it won’t survive what’s coming.",
      },
      {
        url: LINKEDIN_YC,
        title: "YC Startup School India",
        role: "founder",
        excerpt:
          "Now back to building IndieTerminal, trying to turn internet noise into something founders can actually use.",
      },
    ],
    degraded: true,
    gaps: [
      "No public IndieTerminal repository — stack, architecture and activity are inferred from a personal site.",
      "No pricing, waitlist, docs, or download.",
      "The live product cannot be opened; only the founder's description of it.",
    ],
    generatedAt: daysAgo(0),
  },
};

const decisions: Decision[] = [
  {
    id: "dec_it_blr",
    companyId: COMPANY_ID,
    question:
      "Ship a founder directory for YC Startup School Bangalore in one day?",
    context:
      "A real event, a real networking problem, and a few hours before people needed it.",
    options: [
      {
        id: "opt_ship",
        label: "Ship it today",
        detail: "A single place for BLR founders, with QR-code cards.",
      },
      {
        id: "opt_skip",
        label: "Skip it",
        detail: "Protect time for the stealth terminal.",
      },
    ],
    status: "committed",
    founderConfidence: 80,
    agentConfidence: 62,
    chosenOptionId: "opt_ship",
    commitmentRationale:
      "A real room of founders is a better test than another week of stealth.",
    round: 1,
    createdAt: daysAgo(140),
    committedAt: daysAgo(140),
  },
  {
    id: "dec_it_live",
    companyId: COMPANY_ID,
    question:
      "Stay in stealth another month, or ship a public IndieTerminal waitlist this week?",
    context:
      "The site still says Active Stealth. The public writing says a product that needs clicks will not survive. There is no public repo, no price, and no one outside the founder has been asked to try it.",
    options: [
      {
        id: "opt_stealth",
        label: "Stay in stealth",
        detail: "Another month on the build before anyone can sign up.",
      },
      {
        id: "opt_waitlist",
        label: "Ship a waitlist this week",
        detail: "A public URL, an ask, and a number that can be wrong.",
      },
    ],
    status: "open",
    founderConfidence: 58,
    agentConfidence: 41,
    round: 1,
    createdAt: daysAgo(1),
  },
];

const argumentList: Argument[] = [
  {
    id: "arg_it01",
    decisionId: "dec_it_live",
    perspective: "technical",
    stance: "conditional",
    claim:
      "Another month of stealth still leaves nothing an agent — or a user — can inspect.",
    reasoning:
      "There is no public repository. The Brain cannot read a PTY layer, an agent runtime, or a single file. Stealth does not change that. A waitlist without a public surface also does not change that. The technical object that would make either option honest is a repo or a build someone else can run.",
    basis: [
      { type: "fact", ref: "fact_it07", label: "No public IndieTerminal repository" },
    ],
    strength: 72,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_it02",
    decisionId: "dec_it_live",
    perspective: "product",
    stance: "against",
    claim:
      "You have not decided what the product is, so stealth and a waitlist are both polishing a blur.",
    reasoning:
      "The site is a terminal. The post is a company brain. Those are different objects. A waitlist that does not say which one people are signing up for will teach you nothing about demand. Another month of stealth on an unnamed object will not name it either.",
    basis: [
      {
        type: "assumption",
        ref: "asm_it02",
        label: "Company brain and terminal are the same product",
      },
    ],
    strength: 81,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_it03",
    decisionId: "dec_it_live",
    perspective: "gtm",
    stance: "for",
    claim:
      "You already have evidence that shipping a specific public tool gets attention. Stealth does not.",
    reasoning:
      "YC BLR Directory: 100+ visitors and 500+ pageviews in twelve hours, built in six. That is the only numbered distribution event on the record. IndieTerminal has been in stealth long enough to have a positioning post and not a URL. If the question is whether anyone cares, only a public ask answers it.",
    basis: [
      {
        type: "fact",
        ref: "fact_it06",
        label: "YC BLR Directory: 100+ visitors in 12 hours",
      },
    ],
    strength: 78,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_it04",
    decisionId: "dec_it_live",
    perspective: "financial",
    stance: "against",
    claim:
      "A waitlist with nothing to buy is a list, not a business test.",
    reasoning:
      "There is no price. A waitlist this week measures curiosity, not willingness to pay, and it costs the stealth option you still seem to value. The cheaper experiment is naming one person who would pay, in writing, before you open a list.",
    basis: [
      { type: "fact", ref: "fact_it03", label: "Still listed as Active Stealth" },
    ],
    strength: 64,
    status: "standing",
    round: 1,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "arg_it05",
    decisionId: "dec_it_live",
    perspective: "contrarian",
    stance: "against",
    claim:
      "Your own line about clicks is already an argument against another month of a product nobody can use.",
    reasoning:
      "You wrote that a product which does not work without clicks will not survive. IndieTerminal currently does not work with or without clicks — it is not public. Staying in stealth is choosing the thing you said dies. A waitlist is still a click. The missing option is a build an agent can operate this week.",
    basis: [
      {
        type: "fact",
        ref: "fact_it05",
        label: "A product that needs clicks will not survive",
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
    id: "risk_it01",
    decisionId: "dec_it_live",
    title: "Waitlist without a named product",
    detail:
      "If the page says terminal and the post says company brain, signups will be for two different things. The conversion number will be unreadable.",
    severity: 4,
    likelihood: "high",
    status: "open",
    perspective: "product",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "risk_it02",
    decisionId: "dec_it_live",
    title: "Stealth becomes the product",
    detail:
      "Active Stealth is already the public status. Another month has no exit test. There is no definition of 'ready'.",
    severity: 4,
    likelihood: "high",
    status: "open",
    perspective: "gtm",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "risk_it03",
    decisionId: "dec_it_live",
    title: "No second reader of the code",
    detail:
      "Without a public repo, a waitlist still depends on one person being able to ship whatever was promised. That is the same bus factor stealth was supposed to hide.",
    severity: 3,
    likelihood: "medium",
    status: "open",
    perspective: "technical",
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
];

const contradictions: Contradiction[] = [
  {
    id: "con_it01",
    decisionId: "dec_it_live",
    summary:
      "You argue agents must be able to act without clicks, and you are keeping the product where nobody — agent or human — can act at all.",
    sideA:
      "Public writing: a product that does not work without clicks will not survive.",
    sideB:
      "Public status: Active Stealth. No URL, no repo, no agent-callable surface.",
    resolved: false,
    createdBy: "arena",
    createdAt: daysAgo(1),
  },
];

const evidence: Evidence[] = [
  {
    id: "ev_it01",
    decisionId: "dec_it_live",
    statement:
      "Has any person other than the founder run a build of IndieTerminal?",
    status: "requested",
    requestedBy: "arena",
    createdAt: daysAgo(1),
  },
  {
    id: "ev_it02",
    decisionId: "dec_it_live",
    statement:
      "In one sentence, is the waitlist for a terminal emulator or for a company brain?",
    status: "requested",
    requestedBy: "arena",
    createdAt: daysAgo(1),
  },
];

const outcomes: Outcome[] = [
  {
    id: "out_it_blr",
    decisionId: "dec_it_blr",
    result: "succeeded",
    summary:
      "The directory shipped in six hours and recorded 100+ visitors and 500+ pageviews in twelve. It solved a networking problem for a real event.",
    lesson:
      "A specific tool for a room that already exists gets used. That is not evidence that a stealth terminal will.",
    recordedAt: daysAgo(139),
  },
];

export function showcaseSnapshot() {
  return {
    company: SHOWCASE_COMPANY,
    decisions,
    predictions: [],
    outcomes,
    patterns: detectPatterns(COMPANY_ID, [], decisions),
    argumentList,
    defenses: [],
    reassessments: [],
    risks,
    evidence,
    contradictions,
    actionItems: [],
    toolCalls: [],
    activeDecisionId: "dec_it_live",
    spotlightId: null,
    pendingCommit: null,
  };
}

export { COMPANY_ID as SHOWCASE_COMPANY_ID };
