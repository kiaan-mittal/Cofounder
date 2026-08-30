# Decision Arena

**AI that argues with you before reality does.**

A decision workspace where a founder and an agent argue about the same
structured state. Built for the WebMCP Challenge.

Founders do not lack information. They lack high-quality disagreement — someone
who knows the company, will not fold when pushed, and remembers what happened
last time. Decision Arena is that second chair, and WebMCP is what lets an
agent sit in it rather than narrate from outside.

```
Company Brain → Decision → Five perspectives argue → You defend
     → The Arena reassesses → Commit → Prediction → Outcome → Calibration
                                    ↑                              │
                                    └──────────────────────────────┘
                              the next decision starts here
```

---

## Why it exists

Three things are true of almost every consequential startup decision, and no
tool addresses them together:

1. **The argument is unrecorded.** You reason it out in the shower, or in a
   chat window, and what survives is a conclusion with the reasoning stripped
   off.
2. **The pushback is fake.** A chatbot asked to challenge you will challenge
   you until you push back, then agree. That is not disagreement, it is
   politeness with extra steps.
3. **Nobody keeps score.** Predictions are made in passing and never checked,
   so a founder who has overestimated growth five times in a row has no idea.

Decision Arena makes the argument a record, makes the pushback survive contact
with your defense, and keeps score whether you like it or not.

---

## How the human–agent collaboration works

### 1. Company Brain

You give a website and a public GitHub repository. The Arena reads them and
produces structured context that separates two things most tools blur:

- **Facts** — something your source actually says, stored with the quote and
  the URL, so you can check the Arena's work.
- **Assumptions** — something you are betting on that no source proves, each
  rated for how much rests on it.

The assumptions are the point. They are what gets attacked.

Ingested pages are treated as untrusted input: content is wrapped in a labelled,
fenced block with an explicit instruction that nothing inside it is an
instruction (`src/server/llm.ts`).

### 2. The Arena

You state a decision. Five specialists argue about it — Technical, Product,
GTM, Financial, and a Contrarian — each grounded in a fact from your Brain, an
assumption you are relying on, or a measured pattern from your own record. Each
argument carries its basis, its stance, and a strength.

This is not a transcript. Every argument, risk, contradiction and evidence
request is a record with an identity, which is what makes the next part
possible.

### 3. Real defense

You push back. The Arena reassesses — and every reassessment names two things:

> **Answered.** You have built 70% of the migration, so the two-month estimate
> was wrong and that objection weakens.
>
> **Still unanswered.** That addresses build time. It does not address the
> opportunity cost of the feature work you stop to finish it.

The second half stays on the page as an unresolved objection. You cannot win
an argument here by scrolling past it.

### 4. Prediction and calibration

Committing leads straight into *what would prove you right* — one number, one
unit, one deadline. When the deadline lands you enter the real number, and the
Arena scores it: within 10% is a hit, within 35% is partial, otherwise a miss.

From those scores it computes accuracy per estimate domain and the mean ratio
between expected and actual. After three outcomes in a domain it starts arguing
from them:

> ⚠️ Your last three growth predictions were 2.0× optimistic. Adjusted for that
> record, the comparable figure is about 250. Defend the 500 if you still
> believe it.

Below three outcomes it says the sample is too small rather than overstating.
The arithmetic is in `src/lib/calibration.ts` — no model involved.

---

## WebMCP architecture

The design question was not "where do we add WebMCP" but "what would an agent
need in order to genuinely participate in a decision". The answer is: read the
same structured workspace the founder is looking at, and change it in the same
semantic terms.

So the tools are decision primitives. There is no `click_commit_button` and no
`scroll_to_risks`. There is `challenge_argument`, `flag_contradiction` and
`create_prediction`. **The page decides how a semantic action is rendered** —
when an agent challenges an argument, that argument gets a red pen ring and
moves to `unresolved`, because that is what the UI does with a challenge.

### Registration

Tools are registered on `document.modelContext` for the lifetime of the app
shell. The spec has no `unregisterTool()`, so lifetime is scoped to an
`AbortSignal`:

```ts
// src/webmcp/registry.ts
const modelContext = nativeModelContext() ?? document.modelContext;

for (const tool of ARENA_TOOLS) {
  await modelContext.registerTool(instrument(tool), { signal });
}
```

`instrument()` wraps each tool so every call is timed, recorded in the
workspace log with its arguments and result, attributed to a channel, and given
a visual spotlight. A founder watching the screen can always see that something
changed, and who changed it.

### Native first, shim only as a fallback

WebMCP is not in any stable browser yet. Decision Arena uses the native
implementation when one exists and installs a spec-shaped shim only when the
platform provides nothing (`src/webmcp/polyfill.ts`). The shim implements
`registerTool`, `getTools`, `executeTool` and the `toolchange` event, and
nothing more.

The status indicator in the header says which one you are on — `native`,
`shim`, or `unavailable`. It never claims native support it does not have, and
the app never appears broken when WebMCP is missing.

### The in-page sparring agent

The Arena ships an agent you can let into the room. It is an *author-provided
agent* in the explainer's sense and has **no privileged access**: it discovers
tools with `getTools()` and invokes them with `executeTool()`, exactly as an
external browser agent would.

```ts
// src/webmcp/agent.ts
const tools  = await modelContext.getTools();
const target = tools.find(t => t.name === plan.tool);
const result = await modelContext.executeTool(target, plan.args);
```

That is deliberate. If the demo agent had a back door, the demo would prove
nothing. Because it goes through the same door, watching it work *is* a
demonstration of the tool surface.

### Guard rail: agents propose, founders commit

`commit_decision` does not commit anything. It stages a proposal that the
founder confirms with one click, with the agent's reasoning shown. An agent can
argue a founder into a decision; it cannot make one for them.

---

## WebMCP tools

Seventeen tools in four groups. Every one is live at `/webmcp`, where the page
lists what `getTools()` actually returns and lets you execute any read-only
tool and see the exact payload an agent would receive.

### Context — read the workspace

| Tool | What it returns |
| --- | --- |
| `get_company_brain` | Product, market, stack, and the fact/assumption split |
| `get_current_decision` | Question, options, arguments, defenses, reassessments, confidences |
| `get_decision_history` | Past decisions with what was chosen, predicted, and what happened |
| `get_founder_patterns` | Measured patterns, e.g. growth estimates 2.1× optimistic |
| `get_open_risks` | Risks still open on a decision, by severity |
| `get_predictions` | Expected vs actual, with deadlines and status |
| `get_calibration` | Accuracy per domain, with a `reliable` flag when the sample is thin |

### Debate — participate in the reasoning

| Tool | Effect on the workspace |
| --- | --- |
| `add_argument` | New argument card, attributed to a perspective, with its basis |
| `challenge_argument` | Attaches a counter-claim and marks the original unresolved |
| `request_evidence` | Puts a checkable request on the record; blocks commitment |
| `flag_contradiction` | Two things that cannot both be true, both sides quoted |
| `add_risk` | Risk with severity and likelihood, open until resolved |

### Action — turn reasoning into commitment

| Tool | Effect |
| --- | --- |
| `create_prediction` | Falsifiable number, unit and deadline |
| `add_action_item` | Concrete next step attached to the decision |
| `commit_decision` | **Proposes** a commitment for the founder to confirm |

### Outcome — feed reality back in

| Tool | Effect |
| --- | --- |
| `evaluate_prediction` | Records the real number, scores it, recomputes calibration |
| `record_outcome` | Result plus the transferable lesson, quoted back later |

---

## Local setup

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | one of these two | Model access, used server-side only |
| `AI_GATEWAY_API_KEY` | one of these two | Same, routed through the Vercel AI Gateway |
| `OPENAI_MODEL` | no | Defaults to `gpt-5` |
| `OPENAI_FALLBACK_MODEL` | no | Defaults to `gpt-4.1`, used if the first returns unparseable output |
| `OPENAI_BASE_URL` | no | For OpenAI-compatible endpoints |
| `GITHUB_TOKEN` | no | Raises the public API rate limit; no scopes needed, never used to write |
| `GITHUB_CLIENT_ID` | for private repos | OAuth App client ID. Create one at github.com/settings/applications/new |
| `GITHUB_CLIENT_SECRET` | for private repos | OAuth App secret. Callback: `/api/auth/github/callback` |
| `NEXT_PUBLIC_APP_URL` | no | App origin used for the GitHub callback. Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Project URL from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Server-only. The API uses this to save workspaces. Never expose it to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Optional publishable key; writes go through `/api/workspace` |

Keys are read only in server routes, except the public Supabase URL. Nothing model-related reaches the client.

Onboarding URLs and the workspace snapshot are written to `localStorage` as you type, then synced to the `workspaces` table so a refresh does not wipe the fields. Apply `supabase/migrations/20260830120000_workspaces.sql` once in the SQL editor.

### Without a key

Everything except live Brain-building and live debate still works: the worked
example, the full tool surface, commitment, predictions, outcomes and
calibration. The onboarding screen says so plainly rather than failing at the
first request.

---

## Demo

**Fast path (no key needed).** Onboarding → *Open the worked example* → *Arena*.
You land in an argued decision with five standing arguments, an unresolved
contradiction drawn from the founder's own recorded lesson, two outstanding
evidence requests, and a calibration profile built from eight predictions that
have already met reality. Then open `/webmcp` and run any read-only tool.

**Full path.** With a key set:

1. Enter a website and a GitHub repository. Sign in with GitHub if the repo is
   private. Watch the Brain build, then read the facts — each with its quote —
   and the assumptions.
2. Ask a real decision: *Should I launch now or spend another month polishing?*
3. Five perspectives argue, grounded in your Brain and your record.
4. Defend yourself: *You're overestimating the polish required.*
5. Read the reassessment. It concedes the part you answered and names the part
   you did not.
6. Let an agent into the room. It reads your history through WebMCP, finds
   where this decision repeats one that already failed, and puts a contradiction
   on the page. The workspace changes while you are looking at it.
7. Commit — the Arena lists what is still unresolved and makes you acknowledge
   carrying it.
8. Answer *what would prove you right?* If the number contradicts your record,
   you are told by how much before you can record it.
9. Later, enter the real number. Calibration updates, and the next decision
   begins from it.

---

## Architecture

```
src/
  app/                     Next.js App Router
    page.tsx               Landing
    onboarding/            Website + GitHub → Company Brain
    brain/                 Facts, assumptions, product, market, technical
    arena/                 The workspace: arguments, defense, margin, commit
    history/               Decisions, predictions, outcome recording
    calibration/           Accuracy per domain, detected patterns
    webmcp/                Live tool surface — start here if you are judging
    api/                   Server routes: brain, debate, readiness, sparring

  webmcp/
    spec.ts                Types matching the WebMCP specification
    polyfill.ts            Shim, installed only when the platform has nothing
    registry.ts            Registration, attribution, logging, spotlight
    context-tools.ts       Read the workspace
    debate-tools.ts        Argue, challenge, demand evidence
    decision-tools.ts      Predictions, action items, commitment proposals
    outcome-tools.ts       Results and recalibration
    agent.ts               In-page agent — getTools() / executeTool() only
    provider.tsx           Registers the surface for the app shell's lifetime

  server/                  Server-only: ingestion, prompts, structured output
    ingest.ts              Website + GitHub, with graceful failures
    llm.ts                 Structured generation, fallback, injection defence
    brain.ts               Company Brain prompt and schema
    debate.ts              Opening round, reassessment, readiness

  lib/
    types.ts               The domain model
    store.ts               Local-first persistent workspace
    calibration.ts         Scoring and pattern detection — arithmetic, no model
    selectors.ts           One structured view, shared by the UI and the tools
```

**State.** A single client-side store persisted to `localStorage`. Everything
the founder sees and everything the tools read come from the same selectors, so
the agent's view and the human's view cannot drift. There is no account to
create and nothing leaves the browser except model calls.

**Structured output everywhere.** Every model call is schema-constrained, with
a fallback model when the first returns something unparseable.

---

## Security

- Only the URLs you enter are read, and only their public surface.
- GitHub access is read-only. No token is required, and no scopes are needed
  if you supply one.
- Ingested content is wrapped as untrusted data with explicit instructions that
  it cannot issue instructions.
- API keys are server-side only.
- The WebMCP shim is page-local: it exposes tools to in-page agents, not across
  origins.
- Agents cannot commit decisions. They can only propose.

---

## License

MIT.
