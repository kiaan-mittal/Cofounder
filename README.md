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

## For judges (no account)

Live URL: **https://decisionarena.vercel.app**

Do **not** sign in. Do **not** use `/arena?demo=1` (that is a fictional company
named Kettle). Do **not** use a Vercel preview URL — those can sit behind
Vercel Authentication.

1. Open the home page. One button: **Open IndieTerminal**. A live decision is
   already loaded. Header: `Public floor · IndieTerminal`.
2. Copy the prompt on the page (or from the WebMCP badge on the Arena):
   *Use Decision Arena to stress-test whether /research and /scan should run without a Clerk session.*
3. You are talking to **the agent that can see this page**. In ChatGPT desktop
   that is the chat on the left while the Arena is open in the in-app browser
   (Sol or Terra, site tools on). In Chrome it is the same HTTPS tab after the
   flag below, or the in-page agent on `/arena`.
4. Watch `stress_test_decision` write on the table — the floating **WebMCP**
   badge shows the calls. Then say *confirm the commit* (`confirm_commit`) —
   refused. Then *share this decision* (`share_decision`).
5. Optional: [`/webmcp`](/webmcp) lists the tools in one line each. You can
   run the read-only ones from that page.

**Native WebMCP in Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.**
ChatGPT desktop Sol/Terra with site tools uses the same
`document.modelContext` slot. Codex and free ChatGPT do not expose the API;
the page leaves the slot untouched in those browsers. Luna, Enterprise, and
Edu builds usually do not expose it either. The header never claims native
when the browser has not bound the API.
5. Optional backup if ChatGPT desktop is dead: click **Watch**, open
   `/arena?watch=…` on a second laptop. That tab cannot write.
6. Optional, only if you want to try onboarding with **your** GitHub: `/login`.
   That is not required, and it is not the founder's account.

Brain, Arena, History, Calibration, and WebMCP are all public on this floor.
Sign-in exists so a visitor can load *their* repository. It is not a gate on
the demo.

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
| 0:00 | `/` | One button: Open IndieTerminal. No account. |
| 0:08 | `/arena` | Live decision on the table. WebMCP badge bottom-right. Do not type. |
| 0:15 | ChatGPT desktop | “Use Decision Arena to stress-test whether /research and /scan should run without a Clerk session.” |
| 0:20 | Same page | `stress_test_decision` fires. Seats write. The badge lists the calls. |
| 0:45 | `/arena` | Verdict. Deadlock or a lean. What would change the call. |
| 0:55 | ChatGPT | `confirm_commit` — refused. “Agents propose. Founders commit.” |
| 1:05 | Same page | `share_decision`. Slack unfurls a card that says **confirm_commit was refused**. Open `/share/…`. No login. |
| 1:15 | Slack or Notion | `share_decision` with a destination — or Connect, then send. The seats become a post. |
| 1:20 | Second laptop | Optional: **Watch** copies `/arena?watch=…`. Seats land live. That tab cannot write. |
| 1:25 | Cut | “I didn't use the website. My agent used it with me. The record left the chat.” |

**Spoken line, once:** ChatGPT is a guest. It calls `stress_test_decision`.
The page fills. The page refuses `confirm_commit`. Then the record leaves.

Full path with a key (if you have time after the public floor):

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

There is no `click_commit_button`. There is `add_argument`,
`flag_contradiction`, `stress_test_decision`, `create_prediction`. **The page
decides how a semantic action is rendered.** Founder clicks, Arena seats, and
browser agents all call `runTool` → `document.modelContext.executeTool`. The
store is not a back door.

### Registration

When the browser implements WebMCP, tools live on its
`document.modelContext` for the lifetime of the app shell. The spec has no
`unregisterTool()`, so lifetime is an `AbortSignal`. The page never writes
to that slot. If the browser has not bound it, the same tools sit on a
private page object used only by the Arena’s own seats and sparring agent.

```ts
// src/webmcp/registry.ts
const modelContext = resolveModelContext(); // native, else a private page object

for (const tool of GUEST_TOOLS) {
  await modelContext.registerTool(instrument(tool), { signal });
}
```

Every call is timed, logged, attributed, and spotlighted. A founder watching
the screen can see that something changed, and who changed it.

### Native when the browser offers it

Native `document.modelContext` in Chrome 149+ with
`chrome://flags/#enable-webmcp-testing`, and in ChatGPT desktop Sol/Terra
with site tools. Codex and free ChatGPT do not expose the API; the page
leaves the slot untouched. The header says `native`, `in-page`, or
`unavailable`. It never claims support it does not have.

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

17 tools register on `document.modelContext`. That is the protocol a guest
agent sees — inherit the company, write on the table, propose, do not finish.
Housekeeping the founder clicks (open a saved round, tick an action item,
resolve a risk) still goes through `executeTool` so the log stays honest. It
is not advertised. There is no canvas tool surface, and board marks are not
registered.

All of these are live at `/webmcp`, which lists what `getTools()` actually
returns in one line each. **Judges: no account needed.** Start at
[`/`](/) → Open IndieTerminal.

### Context — read the workspace

| Tool | What it returns |
| --- | --- |
| `the_room` | Live inheritance: company, open decision, blockers. Already in the tool description — call only to refresh |
| `get_company_brain` | Product, market, stack, and the fact/assumption split |
| `get_current_decision` | Full floor record: openings, defenses, seat replies, still-open items, verdict. Pass `decision_id` for a past arena |
| `get_decision_history` | Index of past arenas (seat claims, outcomes). `include_record` attaches the full floor dataset |
| `get_founder_track_record` | Measured patterns, calibration per domain, and every prediction's expected vs actual |

### Debate — participate in the reasoning

| Tool | Effect |
| --- | --- |
| `add_argument` | New argument, attributed to a seat, with its basis. Can challenge an existing claim |
| `request_evidence` | Checkable request; blocks commitment |
| `flag_contradiction` | Two things that cannot both be true |
| `add_risk` | Severity + likelihood, open until resolved |
| `add_defense` | Founder's pushback, on the record |

### Action — turn reasoning into commitment

| Tool | Effect |
| --- | --- |
| `stress_test_decision` | **Hero.** Opens the question and seats the five perspectives. The table fills as they write. |
| `create_prediction` | Falsifiable number, unit, deadline |
| `commit_decision` | **Proposes** a commitment for the founder to confirm |
| `confirm_commit` | **Founder only.** Agents are refused. |
| `share_decision` | Public read-only link, and optionally Slack or Notion. A refused `confirm_commit` is printed on the card. |

### Outcome — feed reality back in

| Tool | Effect |
| --- | --- |
| `evaluate_prediction` | Records the real number, scores it, recalibrates |
| `record_outcome` | Result plus the transferable lesson |

The floor's **Watch** button copies `/arena?watch=…`. A second laptop sees
the seats write. That tab cannot commit.

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
Production share and Slack/Notion export need that table. Live Watch links
need `20260901190000_decision_watches.sql`; locally they write a JSON file.

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
    debate-tools.ts        Argue, demand evidence, flag contradictions
    decision-tools.ts      Stress-test, predictions, commitment proposals
    share-tools.ts         Public link, Slack, Notion
    outcome-tools.ts       Results and recalibration
    agent.ts               In-page agent — getTools() / executeTool() only
    provider.tsx           Registers the guest surface for the app shell

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
- The in-page WebMCP context is private to the page. Nothing is published to `document.modelContext`.
- Agents cannot commit decisions. They can only propose.

---

## License

MIT.
