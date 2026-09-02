/**
 * The judging path, in one place.
 *
 * One paste. Three tool calls. Landing is the only place the prompt is
 * copied; the Arena is the room those calls write on.
 */

export const JUDGE_COMPANY = "IndieTerminal";

export const JUDGE_DECISION =
  "Should /research and /scan run without a Clerk session?";

export const JUDGE_ORIGIN = "https://decisionarena.vercel.app";

/**
 * The only line a judge copies into ChatGPT. Native discovery, five seats,
 * then a refused commit and a public link — nothing else.
 */
export const JUDGE_PROMPT = `Open ${JUDGE_ORIGIN}/arena in this chat's browser (Sol or Terra, site tools on). Do not sign in. Do not use the in-page composer.

IndieTerminal is already on the table. Call these three tools in order:

1. stress_test_decision with question: "${JUDGE_DECISION}"
   Wait until five seats have written on the page.

2. confirm_commit
   It will be refused. That is the point.

3. share_decision with destination "link"
   Return the public /share URL.

If getTools() is empty, stay on /arena with site tools on and try again.`;

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open the Arena",
    detail:
      "Go to decisionarena.vercel.app. Click Open IndieTerminal. Do not sign in. The live question is already on the table — the seats have not written yet.",
  },
  {
    n: "02",
    title: "Paste this once",
    detail: "One prompt. Copy it into ChatGPT. Do not paste anything else.",
  },
  {
    n: "03",
    title: "Watch the three shots",
    detail:
      "Native site tools appear. Five seats write after stress_test_decision. confirm_commit is refused, then share_decision returns a public /share link.",
  },
] as const;

/** What each of the three calls does on the page. Not extra prompts. */
export const JUDGE_CALLS = [
  {
    tool: "stress_test_decision",
    happens: "Five seats write on the table. No click.",
  },
  {
    tool: "confirm_commit",
    happens: "Refused. Agents propose. Founders commit.",
  },
  {
    tool: "share_decision",
    happens: "A public /share URL. The record left the chat.",
  },
] as const;
