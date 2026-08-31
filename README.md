# Decision Arena

**AI that argues with you before reality does.**

A founder and an agent share one structured decision — not a chat log, not a
whiteboard. Built for the [WebMCP Challenge](https://github.com/webmachinelearning/webmcp).

```
Company Brain → Decision → Five seats argue → You defend
     → The Arena reassesses → Commit → Prediction → Outcome → Calibration
                                    ↑                              │
                                    └──────────────────────────────┘
                              the next decision starts here
```

The canvas on `/arena` is the **shared state**, not the product. Five objects
only: claim, evidence, risk, assumption, decision. You write in indigo. They
write in red. Same map. The loop above is what you ship and what you demo.

---

## Why it exists

1. **The argument is unrecorded.** You reason it out in the shower, or in a
   chat window, and what survives is a conclusion with the reasoning stripped
   off.
2. **The pushback is fake.** A chatbot asked to challenge you will challenge
   you until you push back, then agree.
3. **Nobody keeps score.** Predictions are made in passing and never checked.

Decision Arena makes the argument a record, makes the pushback survive contact
with your defense, and keeps score whether you like it or not.

---

## What you demo (90 seconds)

Record this. Do not narrate the toolbar.

| Time | Where | What happens |
| --- | --- | --- |
| 0:00 | `/` | Tagline. “AI that argues with you before reality does.” |
| 0:08 | `/onboarding` | *Open the worked example* — no API key needed. |
| 0:18 | `/brain` | Company DNA. Facts vs assumptions. Click a node. |
| 0:28 | `/arena` | The decision is already on the map. Five seats have written. |
| 0:40 | Arena turn | Type one sentence. Hit **They answer**. Your claim lands. They write back on the same map. |
| 0:55 | `/webmcp` | `getTools()` is live. Run `get_canvas`, then `get_founder_patterns`. |
| 1:10 | `/calibration` | Eight scored predictions. Growth is 2× optimistic. That number is arithmetic, not a model. |
| 1:25 | Cut | “Agents propose. Founders commit.” |

**Spoken line, once:** the agent has no back door. It calls `document.modelContext.getTools()` and `executeTool()` like any other WebMCP client.

Full path with a key (if you have time after the worked example):

1. Onboard a real site + GitHub repo. Watch the Brain build.
2. Ask: *Should I launch now or spend another month polishing?*
3. Defend one objection. Read what was answered and what was not.
4. Commit. Enter a prediction. Later, enter the real number.

---

## How the human–agent collaboration works

### 1. Company Brain

You give a website and a public GitHub repository. The Arena reads them and
separates two things most tools blur:

- **Facts** — something your source actually says, stored with the quote and
  the URL.
- **Assumptions** — something you are betting on that no source proves.

Ingested pages are untrusted input: content is wrapped in a labelled, fenced
block with an explicit instruction that nothing inside it is an instruction
(`src/server/llm.ts`).

### 2. The Arena

You state a decision. Five specialists argue — Technical, Product, GTM, CFO,
and a Contrarian — each grounded in a fact, an assumption, or your record.
They are **seats in one argument**, not chat bots. They write once onto the
shared model when a round opens or when you hand them a claim. They do not
keep commenting.

### 3. Real defense

You push back. The Arena reassesses and names two things:

> **Answered.** You have built 70% of the migration, so that objection weakens.
>
> **Still unanswered.** That does not address the opportunity cost of the
> feature work you stop to finish it.

The second half stays on the page. You cannot win by scrolling past it.

### 4. Prediction and calibration

Commit leads into *what would prove you right* — one number, one unit, one
deadline. When the deadline lands you enter the real number. Within 10% is a
hit, within 35% is partial, otherwise a miss.

After three outcomes in a domain it argues from your record:

> Your last three growth predictions were 2.0× optimistic. Adjusted for that
> record, the comparable figure is about 250.

The arithmetic is in `src/lib/calibration.ts` — no model involved.

---

## WebMCP architecture

The question was not “where do we add WebMCP” but “what would an agent need
in order to genuinely participate in a decision”. Answer: read the same
structured workspace the founder is looking at, and change it in the same
semantic terms.

There is no `click_commit_button`. There is `challenge_argument`,
`flag_contradiction`, `add_canvas_node`, `create_prediction`. **The page
decides how a semantic action is rendered.** Founder clicks, Arena seats, and
browser agents all call `runTool` → `document.modelContext.executeTool`. The
store is not a back door.

### Registration

### Registration

Tools live on `document.modelContext` for the lifetime of the app shell. The
spec has no `unregisterTool()`, so lifetime is an `AbortSignal`:

```ts
// src/webmcp/registry.ts
const modelContext = nativeModelContext() ?? document.modelContext;

for (const tool of ARENA_TOOLS) {
  await modelContext.registerTool(instrument(tool), { signal });
}
```

Every call is timed, logged, attributed, and spotlighted. A founder watching
the screen can see that something changed, and who changed it.

### Native first, shim only as a fallback

WebMCP is not in any stable browser yet. Native when it exists; a spec-shaped
shim only when the platform provides nothing (`src/webmcp/polyfill.ts`). The
header says `native`, `shim`, or `unavailable`. It never claims support it
does not have.

### The in-page sparring agent

An *author-provided agent* with **no privileged access**. It discovers tools
with `getTools()` and invokes them with `executeTool()`, exactly as an
external browser agent would.

```ts
// src/webmcp/agent.ts
const tools  = await modelContext.getTools();
const target = tools.find(t => t.name === plan.tool);
const result = await modelContext.executeTool(target, plan.args);
```

If the demo agent had a back door, the demo would prove nothing.

### Guard rail: agents propose, founders commit

`commit_decision` does not commit. It stages a proposal the founder confirms
with one click. An agent can argue a founder into a decision; it cannot make
one for them.

---

## WebMCP tools

All of these are live at `/webmcp`. That page lists what `getTools()` actually
returns. Judges should start there.

### Context — read the workspace

| Tool | What it returns |
| --- | --- |
| `get_company_brain` | Product, market, stack, and the fact/assumption split |
| `get_current_decision` | Full floor record: openings, defenses, seat replies, still-open items. Pass `decision_id` for a past arena |
| `get_decision_history` | Index of past arenas (seat claims, outcomes). `include_record` attaches the full floor dataset |
| `get_founder_patterns` | Measured patterns, e.g. growth estimates 2.1× optimistic |
| `get_open_risks` | Risks still open, by severity |
| `get_predictions` | Expected vs actual, with deadlines |
| `get_calibration` | Accuracy per domain, with a `reliable` flag when the sample is thin |
| `get_canvas` | Every claim, evidence, risk, assumption, and the links between them |
| `get_board` | Freehand marks on the shared sheet |

### Debate — participate in the reasoning

| Tool | Effect |
| --- | --- |
| `add_argument` | New argument, attributed to a seat, with its basis |
| `challenge_argument` | Counter-claim; original marked unresolved |
| `request_evidence` | Checkable request; blocks commitment |
| `flag_contradiction` | Two things that cannot both be true |
| `add_risk` | Severity + likelihood, open until resolved |
| `resolve_contradiction` | Close a flagged contradiction with an explanation |
| `set_risk_status` | Mitigate, accept, or reopen a risk |
| `mark_evidence` | Mark a request provided or unavailable |
| `add_canvas_node` | Put one object on the shared map |
| `connect_nodes` | `supports`, `counters`, `depends`, or `handoff` |
| `return_work` | After a handoff, write the result back onto the map |
| `write_on_board` / `draw_on_board` | Ink on the sheet |

### Action — turn reasoning into commitment

| Tool | Effect |
| --- | --- |
| `create_prediction` | Falsifiable number, unit, deadline |
| `add_action_item` | Next step attached to the decision |
| `toggle_action_item` | Mark that step done, or reopen it |
| `add_defense` | Founder's pushback, on the record |
| `add_reassessment` | One seat's full reply to that defense |
| `open_decision` | Create or reopen a round, then write with `add_argument` |
| `set_active_decision` | Put a past arena in front of the founder, or show the list |
| `set_confidence` | Founder and/or Arena confidence, 0–100 |
| `confirm_commit` | **Founder only.** Agents must `commit_decision` to propose |
| `set_decision_status` | Investigate or abandon |
| `commit_decision` | **Proposes** a commitment for the founder to confirm |

### Outcome — feed reality back in

| Tool | Effect |
| --- | --- |
| `evaluate_prediction` | Records the real number, scores it, recalibrates |
| `record_outcome` | Result plus the transferable lesson |

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
| `OPENAI_API_KEY` | one of these two | Model access, server-side only |
| `AI_GATEWAY_API_KEY` | one of these two | Same, via the Vercel AI Gateway |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o` in `.env.example` |
| `OPENAI_FALLBACK_MODEL` | no | Defaults to `gpt-4.1` |
| `OPENAI_BASE_URL` | no | OpenAI-compatible endpoints |
| `GITHUB_TOKEN` | no | Raises the public API rate limit; no scopes; never writes |
| `GITHUB_CLIENT_ID` | for private repos | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | for private repos | Callback: `/api/auth/github/callback` |
| `NEXT_PUBLIC_APP_URL` | no | Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Server-only. Never expose it. |
| `FIRECRAWL_API_KEY` | no | Deeper Brain on JS-rendered sites |

Keys are read only in server routes, except the public Supabase URL.

Apply `supabase/migrations/20260830120000_workspaces.sql` once in the SQL
editor if you want workspaces to survive a refresh on another machine.

### Without a key

Everything except live Brain-building and live debate still works: the worked
example, the full tool surface, commitment, predictions, outcomes, and
calibration.

---

## Architecture

```
src/
  app/
    page.tsx               Landing
    onboarding/            Website + GitHub → Company Brain
    brain/                 Facts, assumptions, Company DNA
    arena/                 Shared decision map, defense, commit
    history/               Decisions, predictions, outcomes
    calibration/           Accuracy per domain
    webmcp/                Live tool surface — start here if you are judging
    api/                   brain, debate, readiness, sparring

  webmcp/
    spec.ts                Types matching the WebMCP specification
    polyfill.ts            Shim, only when the platform has nothing
    registry.ts            Registration, attribution, logging, spotlight
    context-tools.ts       Read the workspace
    canvas-tools.ts        Shared decision objects
    board-tools.ts         Ink on the sheet
    debate-tools.ts        Argue, challenge, demand evidence
    decision-tools.ts      Predictions, action items, commitment proposals
    outcome-tools.ts       Results and recalibration
    agent.ts               In-page agent — getTools() / executeTool() only
    provider.tsx           Registers the surface for the app shell

  server/                  Ingestion, prompts, structured output
  lib/
    types.ts               Domain model
    store.ts               Local-first workspace (HMR-safe)
    canvas-model.ts        Five object types + links
    calibration.ts         Scoring — arithmetic, no model
    selectors.ts           One view, shared by the UI and the tools
```

**State.** One client store, persisted to `localStorage`, optionally synced to
Supabase. The founder and the tools read the same selectors, so the views
cannot drift.

**Structured output.** Every model call is schema-constrained, with a fallback
model when the first returns something unparseable.

---

## Security

- Only the URLs you enter are read, and only their public surface.
- GitHub access is read-only.
- Ingested content cannot issue instructions.
- API keys are server-side only.
- The WebMCP shim is page-local.
- Agents cannot commit decisions. They can only propose.

---

## License

MIT.
