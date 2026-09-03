/**
 * The judging path, in one place.
 *
 * One paste. Landing is the only place the prompt is copied; the Arena is
 * the room those calls write on. ChatGPT creates the arena, seats it, then
 * walks History and Calibration with the tools already on the page.
 */

export const JUDGE_COMPANY = "IndieTerminal";

export const JUDGE_DECISION =
  "Should /research and /scan run without a Clerk session?";

export const JUDGE_ORIGIN = "https://decisionarena.vercel.app";

/**
 * The only line a judge copies into ChatGPT.
 */
export const JUDGE_PROMPT = `Open ${JUDGE_ORIGIN}/arena in this chat's browser (Sol or Terra, site tools on). Do not sign in. Do not use the in-page composer.

IndieTerminal is already loaded. The live question is on the floor. Call these tools in order:

1. stress_test_decision with question: "${JUDGE_DECISION}"
   This creates the arena if needed and seats five structured claims. Wait until Weigh it up shows a verdict (FOR/AGAINST, scores, flip conditions, next move).

2. get_current_decision
   Read the structured seats and the Arena verdict.

3. confirm_commit
   It will be refused. That is the point.

4. share_decision with destination "link"
   Return the public /share URL.

5. get_decision_history
   The page should open History.

6. get_founder_track_record
   The page should open Calibration.

If getTools() is empty, stay on /arena with site tools on and try again.`;

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open the Arena",
    detail:
      "Go to decisionarena.vercel.app. Click Open IndieTerminal. Do not sign in. The live question is already the heading — the seats have not written yet.",
  },
  {
    n: "02",
    title: "Paste this once",
    detail: "One prompt. Copy it into ChatGPT. Do not paste anything else.",
  },
  {
    n: "03",
    title: "Watch the tools write",
    detail:
      "stress_test_decision creates the arena and fills five claim cards. Weigh it up opens. confirm_commit is refused. Then History, then Calibration.",
  },
] as const;

/** What each call does on the page. Not extra prompts. */
export const JUDGE_CALLS = [
  {
    tool: "stress_test_decision",
    happens: "Creates the arena. Five structured claims. Weigh it up.",
  },
  {
    tool: "get_current_decision",
    happens: "Verdict, scores, flip conditions, next move.",
  },
  {
    tool: "confirm_commit",
    happens: "Refused. Agents propose. Founders commit.",
  },
  {
    tool: "share_decision",
    happens: "A public /share URL. The record left the chat.",
  },
  {
    tool: "get_decision_history",
    happens: "Opens History.",
  },
  {
    tool: "get_founder_track_record",
    happens: "Opens Calibration.",
  },
] as const;
