# Decision Arena

**A decision ChatGPT can join. Not one it can own.**

Five seats arguing is a prompt. This is a company-owned decision object:
your repo and site already loaded, your past predictions already scored,
agents writing onto the same table you see — and a commit they are not
allowed to press. Built for the [WebMCP Challenge](https://github.com/webmachinelearning/webmcp)
because that protocol is how a guest is allowed into the room.

```
Company Brain → Decision → Five seats argue → You defend
     → The Arena reassesses → Commit → Prediction → Outcome → Calibration
                                    ↑                              │
                                    └──────────────────────────────┘
                              the next decision starts here
```

The canvas on `/arena` is the **shared state**, not the product. Five objects
only: claim, evidence, risk, assumption, decision. You write in indigo. They
write in red. Same map. Close the chat: the map is still there.

---

## Why ChatGPT cannot just do this

A judge who strips the protocol name off the UI should still have an answer.

| In a ChatGPT thread | On this page |
| --- | --- |
| The model *is* the room. It starts empty unless you paste. | The company is the room. Brain, open evidence, and 2× optimism are already loaded. |
| A contradiction is a paragraph. Close the tab, it is gone. | A contradiction is an object on the founder's table. It blocks commit. It outlives the chat. |
| The model can “commit” in language whenever it wants. | `confirm_commit` returns an error unless the founder calls it. |
| Calibration is a vibe the model will invent. | Calibration is arithmetic on numbers written *before* the fact (`src/lib/calibration.ts`). |

The talking is the waiting room. The product is the **guest rule**: inherit,
write, do not finish.

---

## What you demo (90 seconds)

Do not open with five seats talking. That is the part a prompt can fake.
Open with the part a prompt cannot.

| Time | Where | What happens |
| --- | --- | --- |
| 0:00 | `/arena?demo=1` | A real company and a live decision, no account. Do not type. Say: “I didn't use the website.” |
| 0:10 | ChatGPT desktop | “Use Decision Arena to stress-test whether I should spend $10,000 launching this month.” |
| 0:15 | Same page | `stress_test_decision` fires. The question appears. Seats write one by one. Contradictions land in red. |
| 0:45 | `/arena` | Verdict. Deadlock or a lean. What would change the call. |
| 0:55 | ChatGPT | `confirm_commit` — refused. “Agents propose. Founders commit.” |
| 1:05 | Same page | `share_decision`. Open the public `/share/…` link. No login. |
| 1:15 | Slack or Notion | `share_decision` with a destination — or Connect, then send. The seats become a post. |
| 1:20 | Cut | “I didn't use the website. My agent used it with me. The record left the chat.” |

**Spoken line, once:** ChatGPT is a guest. It calls `stress_test_decision`.
The page fills. The page refuses `confirm_commit`. Then the record leaves.

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

31 tools register on every page; the 4 canvas tools arm only on `/canvas`, so a
tool is never advertised where it cannot reach its target.

All of these are live at `/webmcp`, which lists what `getTools()` actually
returns. **Judges: no account needed.** Start at [`/webmcp`](/webmcp) to read
the surface, or go straight to `/arena?demo=1` for a seeded floor.

### Context — read the workspace

| Tool | What it returns |
| --- | --- |
| `get_company_brain` | Product, market, stack, and the fact/assumption split |
| `get_current_decision` | Full floor record: openings, defenses, seat replies, still-open items, verdict. Pass `decision_id` for a past arena |
| `get_decision_history` | Index of past arenas (seat claims, outcomes). `include_record` attaches the full floor dataset |
| `get_founder_track_record` | Measured patterns, calibration per domain, and every prediction's expected vs actual |
| `get_canvas` | Every claim, evidence, risk, assumption, and the links between them. Registered on `/canvas` |
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
| `stress_test_decision` | **Hero.** Opens the question and seats the five perspectives. The table fills as they write. |
| `create_prediction` | Falsifiable number, unit, deadline |
| `add_action_item` | Next step attached to the decision |
| `toggle_action_item` | Mark that step done, or reopen it |
| `add_defense` | Founder's pushback, on the record |
| `add_reassessment` | One seat's full reply to that defense |
| `open_decision` | Create or reopen a round, then write with `add_argument` |
| `open_saved_decision` | Open the most recent arena, a specific one by id, or the list |
| `write_decision_summary` | The framing paragraph at the top of the record |
| `set_confidence` | Founder and/or Arena confidence, 0–100 |
| `confirm_commit` | **Founder only.** Agents must `commit_decision` to propose |
| `share_decision` | Public read-only link, and optionally Slack or Notion. No login to read. |
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
| `COMPOSIO_API_KEY` | for GitHub login + Slack/Notion export | Composio |
| `GITHUB_CLIENT_ID` | for private repos | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | for private repos | Callback: `/api/auth/github/callback` |
| `NEXT_PUBLIC_APP_URL` | no | Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | for persistence | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Server-only. Never expose it. |
| `FIRECRAWL_API_KEY` | no | Deeper Brain on JS-rendered sites |

Keys are read only in server routes, except the public Supabase URL.

Apply the SQL in `supabase/migrations/` in filename order. Local share links
work without `20260901120000_decision_shares.sql` (they write a JSON file).
Production share and Slack/Notion export need that table.

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
    share/                 Public read-only decision brief
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
    share-tools.ts         Public link, Slack, Notion
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
