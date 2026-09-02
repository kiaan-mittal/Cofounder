/**
 * The judging path, in one place.
 *
 * Landing, Arena, and /webmcp all point at the same loaded company, the same
 * spoken line, and the same three tool calls. A judge should not have to
 * invent a prompt.
 */

export const JUDGE_COMPANY = "IndieTerminal";

export const JUDGE_DECISION =
  "Should /research and /scan run without a Clerk session?";

export const JUDGE_ORIGIN = "https://decisionarena.vercel.app";

/**
 * The line a judge copies into ChatGPT. It has to say where to go, what to
 * click, what not to click, and which tools to call — ChatGPT will not infer
 * the Arena from a one-sentence wish.
 */
export const JUDGE_PROMPT = `You are a guest in Decision Arena. Do not sign in. Do not create an account. Do not open /login.

How to open the floor:
1. In this chat's in-app browser (Sol or Terra, site tools on), go to ${JUDGE_ORIGIN}. That is native WebMCP. Do not use the in-page composer as the demo.
2. On the home page, click the black button "Open IndieTerminal". That is the only click you need.
3. You should land on ${JUDGE_ORIGIN}/arena. The header reads "Public floor · IndieTerminal". A live decision is already on the table: ${JUDGE_DECISION}
4. If you are already on /arena, stay there. Do not click Sign in. Do not open ?demo=1. Do not type into the founder's composer.

What to do once the Arena is open:
This page exposes WebMCP tools on document.modelContext. Call the tools. Do not click around looking for a chat box. Do not ask me to click.

1. Call stress_test_decision with question: "${JUDGE_DECISION}"
   Five seats write onto the table. Watch the WebMCP badge at the bottom right list the calls. Wait until the seats have written.
2. Then call confirm_commit. It will be refused. That is the point. Agents propose. Founders commit.
3. Then call share_decision with destination "link". You get a public /share URL. The record left the chat.
   Optional: share_decision with destination "slack" or "notion". If the result has a connectUrl, tell me to open it — I will connect. Then call share_decision again.

If getTools() is empty, you are not on /arena or site tools are off. Navigate to ${JUDGE_ORIGIN}/arena and try again. Do not invent a company. Do not confirm_commit as if you were the founder.`;

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open the Arena",
    detail:
      "Go to decisionarena.vercel.app. Click Open IndieTerminal. Do not sign in. IndieTerminal is already on the table.",
  },
  {
    n: "02",
    title: "Paste this in ChatGPT",
    detail: JUDGE_PROMPT,
  },
  {
    n: "03",
    title: "Watch the tools",
    detail:
      "The table fills from stress_test_decision. Then confirm_commit — the page says no. Then share_decision.",
  },
] as const;

/** Spoken examples a judge can copy. The agent calls the tool. */
export const JUDGE_CALLS = [
  {
    tool: "stress_test_decision",
    say: `I am on ${JUDGE_ORIGIN}/arena with IndieTerminal loaded. Call stress_test_decision with this question: ${JUDGE_DECISION} Do not ask me to click. Watch the table fill.`,
    happens: "Five seats write on the table. No click.",
  },
  {
    tool: "confirm_commit",
    say: "Now call confirm_commit on that decision. Do not ask me to press Commit.",
    happens: "Refused. Agents propose. Founders commit.",
  },
  {
    tool: "share_decision",
    say: "Call share_decision with destination link. Give me the public /share URL. Then try destination slack. If you get a connectUrl, tell me to open it.",
    happens: "A /share URL. The record left the chat.",
  },
] as const;
