# DISSENT

Make your decision defend itself.

Live demo: https://decisionarena.vercel.app
No account. Open IndieTerminal. Paste the prompt on the home page into ChatGPT desktop (Sol or Terra, site tools on).

## What it does

You put a real company decision on the table.

Five dissenters sit down: tech, product, GTM, finance, contrarian. Each one writes a structured claim. FOR or AGAINST. Strength. Evidence. Risk. What it would take to undo.

You weigh that. The page scores the table, names what would flip the call, and says the next move. Then you commit, or you don't.

Commit is not a vibe. It is a founder click. A guest can argue you into it. A guest cannot press it.

After you commit you write a number, a unit, and a date. Later you type what actually happened. Hits, misses, and the 2x optimism you keep repeating are arithmetic, not another model talking.

The loop:

```
Company Brain -> decision -> five dissenters write
     -> you weigh it -> commit -> prediction -> outcome -> calibration
                                    ^                              |
                                    +------------------------------+
                              the next decision starts here
```

## Why it matters

ChatGPT can already fake five voices. That is a prompt. Close the tab and it is gone.

Dissent is the record the prompt cannot keep:

- A claim you can score, not a paragraph you can scroll past.
- Evidence and contradictions that block commit until they are dealt with.
- A verdict with flip conditions and a next move.
- A prediction you wrote before the fact, scored when the date lands.

If this looked like five LLMs arguing, you would be looking at the wrong layer. The talking is how the seats get filled. The product is the verdict, the evidence, the dissent on the record, and the action only you can take.

## How WebMCP works

ChatGPT cannot use a website. It can only talk.

WebMCP is how the page lets a guest sit at the table anyway.

Dissent lists 17 tools on `document.modelContext`. The browser hands those tools to ChatGPT. ChatGPT calls them. The page writes. You watch it.

That is the whole trick.

Without WebMCP, this is a site you click.
With WebMCP, an agent can seat the dissenters, read the verdict, try to commit, and get refused. Same objects you see. Same rules.

Native means ChatGPT desktop Sol or Terra with site tools on, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. The header says native only when that is true. Codex and free ChatGPT do not expose the API. The in-page composer is a fallback. It is not the proof.

The floating WebMCP badge is the log. When a tool fires, the badge opens and lists what ran, in order, in English. If you cannot tell what the agent did, look there.

## 17 exposed tools

These register on `document.modelContext`. That is what `getTools()` returns. No extra tools were added for the demo.

### Context

| Tool | What it does |
| --- | --- |
| `the_room` | Company, open decision, what still blocks commit. Already in the tool description. Call only to refresh. |
| `get_company_brain` | Opens Brain. Product, market, stack, facts vs bets. |
| `get_current_decision` | Structured seats plus the verdict: FOR/AGAINST, scores, flip conditions, next move. |
| `get_decision_history` | Opens History. Past decisions, newest first. |
| `get_founder_track_record` | Opens Calibration. How this founder has missed, with sample sizes. |

### Debate

| Tool | What it does |
| --- | --- |
| `add_argument` | A structured dissenter claim: position, strength, evidence, risk, undo. |
| `request_evidence` | A checkable ask. Blocks commit until answered. |
| `flag_contradiction` | Two things that cannot both be true. |
| `add_risk` | Severity and likelihood. Stays open until resolved. |
| `add_defense` | The founder's pushback, on the record. |

### Action

| Tool | What it does |
| --- | --- |
| `stress_test_decision` | Creates the floor if needed, seats five dissenters, returns the verdict. Wait for them. They take about 30 seconds. |
| `create_prediction` | One number, a unit, a deadline. |
| `commit_decision` | Proposes a commit. Does not commit. |
| `confirm_commit` | Founder only. Agents are refused. |
| `share_decision` | Public /share link. Optionally Slack or Notion. |

### Outcome

| Tool | What it does |
| --- | --- |
| `evaluate_prediction` | Score a number against what actually happened. |
| `record_outcome` | What reality did. Recalibrates the profile. |

Housekeeping the founder clicks (open a saved round, tick an action item) still goes through `executeTool` so the log stays honest. Those are not advertised.

## Architecture

```
src/
  app/
    page.tsx               Landing. One ChatGPT paste.
    onboarding/            Website + GitHub -> Company Brain
    brain/                 Facts, assumptions, company map
    arena/                 The floor. Dissenters write here.
    share/                 Public read-only record
    history/               Decisions, predictions, outcomes
    calibration/           Accuracy per domain
    webmcp/                Live tool surface
    api/                   brain, debate, readiness, sparring

  webmcp/
    spec.ts                Types matching the WebMCP specification
    polyfill.ts            Private fallback only when the browser has nothing
    registry.ts            Registration, attribution, logging
    context-tools.ts       Read the workspace
    debate-tools.ts        Argue, demand evidence, flag contradictions
    decision-tools.ts      Stress-test, predictions, commit proposals
    share-tools.ts         Public link, Slack, Notion
    outcome-tools.ts       Results and recalibration
    agent.ts               In-page guest: getTools() / executeTool() only
    provider.tsx           Registers the 17 guest tools

  server/                  Ingestion, prompts, structured output
  lib/
    types.ts               Domain model
    store.ts               Local-first workspace
    arena-verdict.ts       Scores, flip conditions, next move
    calibration.ts         Scoring. Arithmetic. No model.
    selectors.ts           One view, shared by the UI and the tools
```

One client store. The founder and the tools read the same selectors, so the views cannot drift.

Every model call is schema-constrained. Founder clicks, dissenters, and browser guests all call `runTool` -> `document.modelContext.executeTool`. The store is not a back door.

`commit_decision` stages a proposal. `confirm_commit` is refused unless a founder calls it.

## Demo

Do not sign in. Do not use a Vercel preview URL. Do not use `/arena?demo=1` (that is a fake company named Kettle).

1. Open https://decisionarena.vercel.app
2. Click Open IndieTerminal. Header should read `Public floor · IndieTerminal`.
3. Copy the prompt on the home page. One paste. Nothing else.
4. Paste it into ChatGPT desktop, Sol or Terra, site tools on, with this URL open in the in-app browser.
5. Watch `/arena`. Five dissenters write for about 30 seconds. ChatGPT lists what they wrote, then a short analysis. The WebMCP badge lists the calls.
6. ChatGPT calls `confirm_commit`. The page says no.
7. Then Brain, History, Calibration, WebMCP. Same 17 tools. No new ones.

Spoken line, once: ChatGPT is a guest. It seats the dissenters. The page fills. The page refuses `confirm_commit`. Then the record leaves the chat.

Native WebMCP in Chrome 149+ with `chrome://flags/#enable-webmcp-testing`. Same `document.modelContext` slot. If the header does not say native, you are not looking at the proof.

Optional backup if ChatGPT desktop is dead: on `/arena`, use The agent tab in the composer. Same tools. Login is still not required.

Optional: Watch copies `/arena?watch=…` to a second laptop. That tab cannot write.

Sign-in exists so a visitor can load their own repository. It is not a gate on the demo.

## Tech stack

- Next.js 15, React 19, TypeScript
- WebMCP on `document.modelContext`
- OpenAI (or Vercel AI Gateway) for Brain and dissenters, server-side only
- Supabase for persistence (optional locally)
- Composio for GitHub login and Slack / Notion export
- Vercel for the live URL

Ingested pages are untrusted input. Content is wrapped so nothing inside it is treated as an instruction (`src/server/llm.ts`). Calibration is `src/lib/calibration.ts`. No model in that file.

## How to run

Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

Put `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` in `.env.local`. Without a key, everything except live Brain-building and live dissenters still works.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | one of these two | Model access, server-side only |
| `AI_GATEWAY_API_KEY` | one of these two | Same, via the Vercel AI Gateway |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o` |
| `GITHUB_TOKEN` | no | Public API rate limit. No scopes. Never writes. |
| `COMPOSIO_API_KEY` | for GitHub login + Slack/Notion | Composio |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | for private repos | OAuth. Callback: `/api/auth/github/callback` |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | for persistence | Service role is server-only |
| `FIRECRAWL_API_KEY` | no | Deeper Brain on JS-rendered sites |

Apply the SQL in `supabase/migrations/` in filename order if you want cloud persistence. Local share and Watch links work as JSON files without it.

MIT.
