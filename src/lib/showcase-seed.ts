import { detectPatterns } from "@/lib/calibration";
import { SHOWCASE_COMPANY_ID as COMPANY_ID } from "@/lib/guest-workspace";
import type {
  ActionItem,
  Argument,
  Company,
  Contradiction,
  Decision,
  Defense,
  Evidence,
  Outcome,
  Prediction,
  Reassessment,
  Risk,
} from "@/lib/types";

/**
 * The public judging floor.
 *
 * IndieTerminal — the product at indieterminal.com, repo
 * github.com/kiaan-mittal/indieterminal. The founder's personal site is a
 * source, not the company. YC Startup School Bangalore is a different repo
 * (ycblr) and does not belong on this floor.
 */

const SITE = "https://indieterminal.com";
const REPO = "https://github.com/kiaan-mittal/indieterminal";
const PORTFOLIO = "https://www.kiaanmittal.xyz/";
const LINKEDIN_CLICKS =
  "https://www.linkedin.com/posts/kiaan09_most-ai-startups-right-now-are-already-dead-activity-7455953857203060736-vMQv";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const SHOWCASE_COMPANY: Company = {
  id: COMPANY_ID,
  name: "IndieTerminal",
  website: SITE,
  github: REPO,
  createdAt: daysAgo(180),
  sources: [
    {
      kind: "website",
      url: SITE,
      ok: true,
      detail: "Public product — slash-command dashboard at /command.",
      pages: [
        { url: SITE, title: "Indie Terminal", role: "home" },
        { url: `${SITE}/command`, title: "/command", role: "product" },
      ],
    },
    {
      kind: "github",
      url: REPO,
      ok: true,
      detail:
        "Connected project: kiaan-mittal/indieterminal. README, stack, and three surfaces on the record: /research, /post with queue, /command.",
      pages: [
        {
          url: REPO,
          title: "kiaan-mittal/indieterminal",
          role: "repository",
        },
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
      kind: "website",
      url: PORTFOLIO,
      ok: true,
      detail: "Founder's site — status line and stack list, not the product.",
      pages: [{ url: PORTFOLIO, title: "Kiaan Mittal", role: "founder" }],
    },
  ],
  brain: {
    headline:
      "IndieTerminal is a slash-command dashboard for running a startup — research, launch, posting — with an approval queue so nothing leaves without the founder.",
    summary:
      "The live product is indieterminal.com. You type /research, /launch, /post or /operate at /command; past work is stored so the next command can use it; Slack and X wait in a queue. The GitHub project kiaan-mittal/indieterminal is the connected repo (TypeScript, private, last push 30 Aug 2026). The personal site still calls it a next-gen terminal in Active Stealth. Those are not the same object.",
    product: {
      name: "IndieTerminal",
      description:
        "One dashboard for running a startup: slash commands that run workflows, a saved company brain, and an approval queue before anything posts externally.",
      features: [
        "/research — competitor scan with citations",
        "/post — drafts for Slack and X wait in an approval queue",
        "/command — the live slash-command dashboard",
      ],
      maturity: "alpha",
      roadmapSignals: [
        "Public site and /command are live",
        "Repo description still says Bloomberg terminal for indie hackers",
        "Personal site still says Active Stealth / next-gen terminal",
      ],
    },
    market: {
      icp: "Indie hackers and early-stage founders who lose context between ChatGPT, a launch doc, and a posting tab.",
      problems: [
        "Context dies between chats",
        "Research does not feed the next post",
        "External posts go out without a check",
      ],
      positioning:
        "Not a chat. A command surface with memory, and a human gate on anything that leaves.",
      alternatives: [
        "ChatGPT threads",
        "Notion + a social scheduler",
        "Warp / Ghostty as a terminal",
        "Claude Code in an ordinary shell",
      ],
      pricing: null,
    },
    technical: {
      stack: [
        "Next.js 16",
        "React 19",
        "TypeScript",
        "Clerk",
        "Supabase",
        "Tailwind",
        "OpenAI",
        "Resend",
      ],
      architectureNotes:
        "Slash commands load a startup profile plus saved brain records, draft with OpenAI where needed, persist to Supabase, and send Slack or X through an approval queue. Auth is Clerk. The connected repo is kiaan-mittal/indieterminal (TypeScript, CSS, PLpgSQL).",
      repoStructure: [
        "/command",
        "Approval queue",
        "Saved brain records",
      ],
      activitySignals: [
        "Created 6 Mar 2026, last push 30 Aug 2026",
        "~10.8k KB TypeScript project",
        "README and stack are on this floor",
      ],
    },
    facts: [
      {
        id: "fact_it01",
        statement:
          "The live product is at indieterminal.com; the README tells you to sign up, set a startup profile, and run commands at /command.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote:
            "go to indieterminal.com and sign up. fill in your startup name/url/category. go to /command.",
        },
      },
      {
        id: "fact_it02",
        statement:
          "The connected GitHub project is kiaan-mittal/indieterminal, described as a Bloomberg terminal for indie hackers & startup founders.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote: "Bloomberg terminal for indie hackers & startup founders.",
        },
      },
      {
        id: "fact_it03",
        statement:
          "Nothing posts to Slack or X until the founder hits approve in the queue.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote:
            "the app drafts things for you but nothing actually posts to Slack or X until you hit approve in the queue on the right.",
        },
      },
      {
        id: "fact_it04",
        statement:
          "Past command output is saved so later commands can reuse it — research from last week shows up when you run /post.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote:
            "Past work gets saved so the next command can use it. Research from last week shows up when you run /post later.",
        },
      },
      {
        id: "fact_it05",
        statement:
          "A public post describes IndieTerminal as a company brain that lets agents act rather than chat, and says a product that needs clicks will not survive.",
        provenance: {
          kind: "founder",
          ref: LINKEDIN_CLICKS,
          quote:
            "Lets agents act, not just chat. If your product doesn’t work without clicks… it won’t survive what’s coming.",
        },
      },
      {
        id: "fact_it06",
        statement:
          "The founder's personal site still lists IndieTerminal as Active Stealth and as a next-gen terminal, which is not what /command is.",
        provenance: {
          kind: "website",
          ref: PORTFOLIO,
          quote:
            "Building the next-gen terminal experience for developers. Active Stealth · Status: In Progress",
        },
      },
      {
        id: "fact_it07",
        statement:
          "Every command currently sits behind Clerk sign-up. An unauthenticated agent cannot run /research.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote: "Clerk for auth. go to indieterminal.com and sign up.",
        },
      },
      {
        id: "fact_it08",
        statement:
          "The stack on the connected repo is Next.js 16, React 19, TypeScript, Clerk, Supabase, Tailwind, OpenAI, Resend.",
        provenance: {
          kind: "github",
          ref: REPO,
          quote:
            "Next.js 16 + React 19 + TypeScript. Clerk for auth. Supabase for the database.",
        },
      },
    ],
    assumptions: [
      {
        id: "asm_it01",
        statement:
          "Founders will run a startup from slash commands instead of ChatGPT plus a doc.",
        rationale:
          "The README is the founder's own pain. There is no count of people who have run /command besides him.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it02",
        statement:
          "Keeping the GitHub private still lets agents act on the product.",
        rationale:
          "Agents on this floor can read the Company Brain. They cannot clone the repo. A product that 'lets agents act' currently requires a Clerk session.",
        risk: "high",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it03",
        statement:
          "The name 'terminal' is a metaphor and will not confuse the people who land on indieterminal.com.",
        rationale:
          "Repo description: Bloomberg terminal. Personal site: next-gen terminal. README: slash-command dashboard. Three objects, one name.",
        risk: "medium",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
      {
        id: "asm_it04",
        statement:
          "An approval queue is enough of a moat versus 'just do it in ChatGPT'.",
        rationale:
          "ChatGPT will post if asked. The queue is the product. It also makes every external action slower.",
        risk: "medium",
        status: "unverified",
        provenance: { kind: "inferred" },
      },
    ],
    openQuestions: [
      "Who besides the founder has run /command on a real company?",
      "Can an agent invoke /research without a Clerk session?",
      "Is the public name a terminal, a Bloomberg box, or a command dashboard?",
    ],
    dossier: [
      {
        url: SITE,
        title: "Indie Terminal",
        role: "home",
        excerpt:
          "Try it: indieterminal.com. One dashboard for running a startup. Slash commands at /command.",
      },
      {
        url: REPO,
        title: "kiaan-mittal/indieterminal",
        role: "repository",
        excerpt:
          "Bloomberg terminal for indie hackers & startup founders. TypeScript repo. Slash commands, saved brain records, nothing posts until approve.",
      },
      {
        url: LINKEDIN_CLICKS,
        title: "Most AI startups right now are already dead.",
        role: "positioning",
        excerpt:
          "A company brain. Stores context. Understands workflows. Lets agents act, not just chat. If your product doesn’t work without clicks… it won’t survive what’s coming.",
      },
      {
        url: PORTFOLIO,
        title: "Kiaan Mittal",
        role: "founder",
        excerpt:
          "Currently building indieterminal. Personal site still says next-gen terminal, Active Stealth, In Progress.",
      },
    ],
    degraded: false,
    gaps: [
      "No public pricing.",
      "No independent usage numbers for /command.",
    ],
    generatedAt: daysAgo(0),
  },
};

const decisions: Decision[] = [
  {
    id: "dec_it_surface",
    companyId: COMPANY_ID,
    question:
      "Ship IndieTerminal as a public slash-command dashboard, or keep building a PTY terminal in private?",
    context:
      "The name says terminal. The pain was losing context between chats. A dashboard at /command could ship. A real emulator could not, not this quarter.",
    options: [
      {
        id: "opt_dash",
        label: "Ship /command publicly",
        detail: "indieterminal.com, slash commands, approval queue.",
      },
      {
        id: "opt_pty",
        label: "Stay private on a PTY",
        detail: "Keep building an actual terminal emulator. No URL.",
      },
    ],
    status: "committed",
    founderConfidence: 74,
    agentConfidence: 61,
    chosenOptionId: "opt_dash",
    commitmentRationale:
      "A URL a founder can type into is a better test than another month of emulator work nobody can run.",
    round: 1,
    createdAt: daysAgo(96),
    committedAt: daysAgo(96),
  },
  {
    id: "dec_it_queue",
    companyId: COMPANY_ID,
    question:
      "Let /post send to X and Slack as soon as the draft is ready, or keep the approval queue?",
    context:
      "The whole pitch is that agents act. The queue is the thing that says they don't, not until you tap approve.",
    options: [
      {
        id: "opt_auto",
        label: "Send when drafted",
        detail: "Faster loop. One bad draft can leave the building.",
      },
      {
        id: "opt_queue",
        label: "Keep the queue",
        detail: "Nothing external without a tap. Slower on purpose.",
      },
    ],
    status: "committed",
    founderConfidence: 82,
    agentConfidence: 70,
    chosenOptionId: "opt_queue",
    commitmentRationale:
      "If the product is a gate, removing the gate is a different product.",
    round: 1,
    createdAt: daysAgo(54),
    committedAt: daysAgo(54),
  },
  {
    id: "dec_it_github",
    companyId: COMPANY_ID,
    question:
      "Open-source kiaan-mittal/indieterminal, or keep the repo private while the site is public?",
    context:
      "The site is already public. The connected GitHub project is not. Agents on this floor can read a README. They cannot read the tree.",
    options: [
      {
        id: "opt_open",
        label: "Make the repo public",
        detail: "Agents and judges can read the command registry.",
      },
      {
        id: "opt_private",
        label: "Keep it private",
        detail: "Ship the site. Hold the code.",
      },
    ],
    status: "committed",
    founderConfidence: 68,
    agentConfidence: 44,
    chosenOptionId: "opt_private",
    commitmentRationale:
      "The site is the demo. The registry is still changing too fast to freeze in public.",
    round: 1,
    createdAt: daysAgo(28),
    committedAt: daysAgo(28),
  },
  {
    id: "dec_it_live",
    companyId: COMPANY_ID,
    question:
      "Should /research and /scan run without a Clerk session, so a browser agent can operate IndieTerminal?",
    context:
      "Every IndieTerminal command currently sits behind Clerk. A product that needs clicks will not survive a browser agent.",
    options: [
      {
        id: "opt_guest",
        label: "Guest /research",
        detail:
          "Unauthenticated /research and /scan, capped. /post and /operate stay behind Clerk.",
      },
      {
        id: "opt_clerk",
        label: "Keep Clerk on every command",
        detail: "No anonymous OpenAI bill. No agent can run a command from a tab.",
      },
    ],
    status: "open",
    founderConfidence: 57,
    agentConfidence: 39,
    round: 1,
    createdAt: daysAgo(1),
  },
];

function arg(
  partial: Omit<Argument, "createdBy" | "round" | "status"> &
    Partial<Pick<Argument, "createdBy" | "round" | "status">>,
): Argument {
  return {
    createdBy: "arena",
    round: 1,
    status: "standing",
    ...partial,
  };
}

const argumentList: Argument[] = [
  arg({
    id: "arg_s01",
    decisionId: "dec_it_surface",
    perspective: "technical",
    stance: "for",
    claim: "A PTY you cannot run is not a product. /command is.",
    reasoning:
      "The connected repo is a Next.js app with a command registry, not an emulator. Shipping the dashboard tests the actual codebase. Another quarter on a PTY tests a codebase that does not exist yet.",
    basis: [
      { type: "fact", ref: "fact_it08", label: "Next.js + command registry" },
    ],
    strength: 79,
    createdAt: daysAgo(96),
  }),
  arg({
    id: "arg_s02",
    decisionId: "dec_it_surface",
    perspective: "product",
    stance: "conditional",
    claim: "Ship /command, but stop calling it a terminal on the landing page.",
    reasoning:
      "People who want Ghostty will bounce. People who lost a ChatGPT thread will stay. The name can wait. The object on the page cannot be a lie.",
    basis: [
      {
        type: "assumption",
        ref: "asm_it03",
        label: "The word terminal will not confuse arrivals",
      },
    ],
    strength: 71,
    createdAt: daysAgo(96),
  }),
  arg({
    id: "arg_s03",
    decisionId: "dec_it_surface",
    perspective: "gtm",
    stance: "for",
    claim: "A public URL is the first distribution event IndieTerminal has.",
    reasoning:
      "Stealth on the personal site produced a status line. A domain produces a number. You cannot calibrate a product that only you have seen.",
    basis: [{ type: "fact", ref: "fact_it01", label: "indieterminal.com is the live product" }],
    strength: 76,
    createdAt: daysAgo(96),
  }),
  arg({
    id: "arg_s04",
    decisionId: "dec_it_surface",
    perspective: "financial",
    stance: "for",
    claim: "The cheaper experiment is the dashboard. The emulator is a year.",
    reasoning:
      "OpenAI drafts, Clerk, Supabase — that is this quarter's burn. A PTY is a different hire, a different stack, a different year of runway you have not named.",
    basis: [{ type: "fact", ref: "fact_it08", label: "Web stack, not a PTY" }],
    strength: 68,
    createdAt: daysAgo(96),
  }),
  arg({
    id: "arg_s05",
    decisionId: "dec_it_surface",
    perspective: "contrarian",
    stance: "against",
    claim: "Shipping /command under the name terminal trains the wrong customer.",
    reasoning:
      "You will spend the next year explaining you are not iTerm. That is not a positioning problem you can patch with a changelog. If you ship, ship under a name that matches the object.",
    basis: [
      { type: "fact", ref: "fact_it02", label: "Repo billed as a Bloomberg terminal" },
    ],
    strength: 73,
    createdAt: daysAgo(96),
  }),

  arg({
    id: "arg_q01",
    decisionId: "dec_it_queue",
    perspective: "technical",
    stance: "for",
    claim: "The queue is already in the pipeline. Removing it is a new product.",
    reasoning:
      "External actions already fork to the approval table. Auto-send means rewriting that fork and living with the first bad /post that hits X at 2am.",
    basis: [{ type: "fact", ref: "fact_it03", label: "Nothing posts until approve" }],
    strength: 80,
    createdAt: daysAgo(54),
  }),
  arg({
    id: "arg_q02",
    decisionId: "dec_it_queue",
    perspective: "product",
    stance: "for",
    claim: "The gate is the reason to leave ChatGPT.",
    reasoning:
      "ChatGPT will post. You will not, until you tap. That is the only sentence on the site a competitor cannot copy this week.",
    basis: [
      {
        type: "assumption",
        ref: "asm_it04",
        label: "The queue is a reason to switch",
      },
    ],
    strength: 84,
    createdAt: daysAgo(54),
  }),
  arg({
    id: "arg_q03",
    decisionId: "dec_it_queue",
    perspective: "gtm",
    stance: "against",
    claim: "A queue nobody uses is friction without a story.",
    reasoning:
      "If /post is run twice a month, the queue is a screenshot. Speed-to-post is how indie hackers actually work. You may be protecting a ritual.",
    basis: [
      { type: "assumption", ref: "asm_it01", label: "Founders will live in /command" },
    ],
    strength: 62,
    createdAt: daysAgo(54),
  }),
  arg({
    id: "arg_q04",
    decisionId: "dec_it_queue",
    perspective: "financial",
    stance: "for",
    claim: "One unapproved post is more expensive than a slow week.",
    reasoning:
      "There is no paid plan yet. Reputation is the account. Auto-send turns a draft model into the public voice of a 14-year-old founder with no undo.",
    basis: [{ type: "fact", ref: "fact_it03", label: "Human gate on outbound" }],
    strength: 77,
    createdAt: daysAgo(54),
  }),
  arg({
    id: "arg_q05",
    decisionId: "dec_it_queue",
    perspective: "contrarian",
    stance: "against",
    claim: "You said agents should act. Then you built a product where they wait.",
    reasoning:
      "The LinkedIn line is 'lets agents act, not just chat'. The README line is 'nothing posts until you hit approve'. Those cannot both be the product. Pick which sentence you are willing to delete.",
    basis: [
      { type: "fact", ref: "fact_it05", label: "Agents should act without clicks" },
    ],
    strength: 81,
    createdAt: daysAgo(54),
  }),

  arg({
    id: "arg_g01",
    decisionId: "dec_it_github",
    perspective: "technical",
    stance: "for",
    claim: "A private repo means this floor is arguing from a README.",
    reasoning:
      "The Brain can name registry.ts. It cannot open it. Judges running WebMCP on Dissent can see 17 tools. They cannot see IndieTerminal's. That is a choice, not a law.",
    basis: [{ type: "fact", ref: "fact_it02", label: "Connected repo is private" }],
    strength: 75,
    createdAt: daysAgo(28),
  }),
  arg({
    id: "arg_g02",
    decisionId: "dec_it_github",
    perspective: "product",
    stance: "against",
    claim: "Opening the repo freezes a command surface that is still moving.",
    reasoning:
      "Public GitHub is a promise about names. /research still changing its output shape every week is a bad first impression to pin.",
    basis: [{ type: "fact", ref: "fact_it04", label: "Brain records still forming" }],
    strength: 66,
    createdAt: daysAgo(28),
  }),
  arg({
    id: "arg_g03",
    decisionId: "dec_it_github",
    perspective: "gtm",
    stance: "for",
    claim: "The site is already the leak. The private repo is theatre.",
    reasoning:
      "Anyone can sign up. The code is the part you are hiding from agents, not from copycats. Copycats will use the product, not git clone.",
    basis: [{ type: "fact", ref: "fact_it01", label: "The product URL is public" }],
    strength: 70,
    createdAt: daysAgo(28),
  }),
  arg({
    id: "arg_g04",
    decisionId: "dec_it_github",
    perspective: "financial",
    stance: "against",
    claim: "There is no revenue to protect. There is also no reason to donate the pipeline.",
    reasoning:
      "OpenAI prompts inside /launch are the only scrap of secret. Public GitHub gives those away for a README badge.",
    basis: [{ type: "fact", ref: "fact_it08", label: "OpenAI inside the pipelines" }],
    strength: 58,
    createdAt: daysAgo(28),
  }),
  arg({
    id: "arg_g05",
    decisionId: "dec_it_github",
    perspective: "contrarian",
    stance: "for",
    claim: "You cannot claim agents act on a system they are not allowed to read.",
    reasoning:
      "Dissent ungated itself so a judge could use it. IndieTerminal still asks for Clerk, then GitHub, then hope. The connected repo being private is the same move with a different password.",
    basis: [
      {
        type: "assumption",
        ref: "asm_it02",
        label: "Private GitHub still lets agents act",
      },
    ],
    strength: 83,
    createdAt: daysAgo(28),
  }),
];

const defenses: Defense[] = [];
const reassessments: Reassessment[] = [];
const risks: Risk[] = [];
const contradictions: Contradiction[] = [];
const evidence: Evidence[] = [];
const actionItems: ActionItem[] = [];

const predictions: Prediction[] = [
  {
    id: "pred_it01",
    decisionId: "dec_it_surface",
    companyId: COMPANY_ID,
    statement: "indieterminal.com gets 500 unique visitors in the first 14 days.",
    domain: "growth",
    metric: "unique visitors",
    expectedValue: 500,
    unit: "visitors",
    deadline: daysAgo(82),
    confidence: 70,
    status: "missed",
    actualValue: 186,
    ratio: 500 / 186,
    evaluatedAt: daysAgo(81),
    createdBy: "founder",
    createdAt: daysAgo(96),
  },
  {
    id: "pred_it02",
    decisionId: "dec_it_surface",
    companyId: COMPANY_ID,
    statement: "/command ships in 21 days from the commit.",
    domain: "timeline",
    metric: "days to public /command",
    expectedValue: 21,
    unit: "days",
    deadline: daysAgo(75),
    confidence: 65,
    status: "partial",
    actualValue: 27,
    ratio: 21 / 27,
    evaluatedAt: daysAgo(74),
    createdBy: "founder",
    createdAt: daysAgo(96),
  },
  {
    id: "pred_it03",
    decisionId: "dec_it_surface",
    companyId: COMPANY_ID,
    statement: "Four slash pipelines live at launch: research, launch, post, operate.",
    domain: "technical",
    metric: "pipelines shipping",
    expectedValue: 4,
    unit: "commands",
    deadline: daysAgo(75),
    confidence: 80,
    status: "hit",
    actualValue: 4,
    ratio: 1,
    evaluatedAt: daysAgo(74),
    createdBy: "founder",
    createdAt: daysAgo(96),
  },
  {
    id: "pred_it04",
    decisionId: "dec_it_queue",
    companyId: COMPANY_ID,
    statement: "Zero unapproved external posts in the first 30 days of the queue.",
    domain: "technical",
    metric: "leaked posts",
    expectedValue: 0,
    unit: "posts",
    deadline: daysAgo(24),
    confidence: 90,
    status: "hit",
    actualValue: 0,
    ratio: 1,
    evaluatedAt: daysAgo(24),
    createdBy: "founder",
    createdAt: daysAgo(54),
  },
  {
    id: "pred_it05",
    decisionId: "dec_it_queue",
    companyId: COMPANY_ID,
    statement: "12 approved /post sends in the first 30 days.",
    domain: "distribution",
    metric: "approved posts",
    expectedValue: 12,
    unit: "posts",
    deadline: daysAgo(24),
    confidence: 60,
    status: "missed",
    actualValue: 3,
    ratio: 12 / 3,
    evaluatedAt: daysAgo(24),
    createdBy: "founder",
    createdAt: daysAgo(54),
  },
  {
    id: "pred_it06",
    decisionId: "dec_it_github",
    companyId: COMPANY_ID,
    statement: "The private repo still receives a push at least weekly.",
    domain: "technical",
    metric: "days between pushes",
    expectedValue: 7,
    unit: "days",
    deadline: daysAgo(2),
    confidence: 75,
    status: "hit",
    actualValue: 2,
    ratio: 7 / 2,
    evaluatedAt: daysAgo(1),
    createdBy: "founder",
    createdAt: daysAgo(28),
  },
  {
    id: "pred_it07",
    decisionId: "dec_it_github",
    companyId: COMPANY_ID,
    statement: "40 people sign up after the private-repo decision.",
    domain: "growth",
    metric: "signups",
    expectedValue: 40,
    unit: "accounts",
    deadline: daysAgo(7),
    confidence: 55,
    status: "missed",
    actualValue: 11,
    ratio: 40 / 11,
    evaluatedAt: daysAgo(6),
    createdBy: "founder",
    createdAt: daysAgo(28),
  },
  {
    id: "pred_it08",
    decisionId: "dec_it_live",
    companyId: COMPANY_ID,
    statement: "If guest /research ships, 40 unauthenticated runs in 14 days.",
    domain: "growth",
    metric: "guest /research runs",
    expectedValue: 40,
    unit: "runs",
    deadline: daysAgo(-14),
    confidence: 50,
    status: "pending",
    createdBy: "founder",
    createdAt: daysAgo(1),
  },
];

const outcomes: Outcome[] = [
  {
    id: "out_it_surface",
    decisionId: "dec_it_surface",
    result: "mixed",
    summary:
      "/command is live. Visitors were 186 against 500. The object that shipped is a slash-command dashboard. The personal site still calls it a terminal.",
    lesson:
      "Shipping the real codebase beat waiting on an emulator. Naming it a terminal after that did not get easier.",
    recordedAt: daysAgo(74),
  },
  {
    id: "out_it_queue",
    decisionId: "dec_it_queue",
    result: "succeeded",
    summary:
      "Nothing leaked. Three approved posts in 30 days against twelve predicted. The gate held; the habit of posting did not appear.",
    lesson:
      "A queue without a posting cadence is a lock on an unused door. Protect the gate, then measure whether anyone walks up to it.",
    recordedAt: daysAgo(24),
  },
  {
    id: "out_it_github",
    decisionId: "dec_it_github",
    result: "mixed",
    summary:
      "The repo stayed private. Signups were 11 against 40. Agents on this floor still cannot read the tree. The site is still the only public surface.",
    lesson:
      "Hiding the repo did not produce users. It did produce a Brain that has to argue from a README.",
    recordedAt: daysAgo(6),
  },
];

export function isStaleShowcase(state: {
  company?: {
    id?: string;
    github?: string;
    brain?: { gaps?: string[]; product?: { features?: string[] } };
  } | null;
  decisions?: Array<{ id?: string; question?: string; context?: string }>;
  argumentList?: Array<{ id?: string; decisionId?: string }>;
  defenses?: Array<{ id?: string; decisionId?: string }>;
}) {
  if (state.company?.id !== COMPANY_ID) return false;
  const github = (state.company.github ?? "").toLowerCase();
  if (!github.includes("kiaan-mittal/indieterminal")) return true;
  const ids = new Set((state.decisions ?? []).map((item) => item.id));
  if (!ids.has("dec_it_live") || !ids.has("dec_it_surface")) return true;
  if ((state.company.brain?.gaps ?? []).some((gap) => /file tree/i.test(gap))) {
    return true;
  }
  if ((state.company.brain?.product?.features ?? []).length > 3) return true;
  if ((state.argumentList ?? []).some((item) => /^arg_it\d+/.test(item.id ?? ""))) {
    return true;
  }
  if ((state.defenses ?? []).some((item) => /^def_it/.test(item.id ?? ""))) {
    return true;
  }
  const live = (state.decisions ?? []).find((item) => item.id === "dec_it_live");
  if (live?.context && /stopped requiring GitHub/i.test(live.context)) {
    return true;
  }
  return (state.decisions ?? []).some((item) =>
    /startup school|founder directory for yc|\bycblr\b/i.test(item.question ?? ""),
  );
}

export function showcaseSnapshot() {
  return {
    company: SHOWCASE_COMPANY,
    decisions,
    predictions,
    outcomes,
    patterns: detectPatterns(COMPANY_ID, predictions, decisions),
    argumentList,
    defenses,
    reassessments,
    risks,
    evidence,
    contradictions,
    actionItems,
    toolCalls: [],
    activeDecisionId: "dec_it_live",
    spotlightId: null,
    pendingCommit: null,
  };
}

export { COMPANY_ID as SHOWCASE_COMPANY_ID };
