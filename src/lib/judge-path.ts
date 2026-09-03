/**
 * The judging path, in one place.
 *
 * One paste. Landing is the only place the prompt is copied. The floor is
 * the room those calls write on. ChatGPT waits for the dissenters, recaps
 * them, proposes a commit, then walks Brain, History, Calibration, and WebMCP
 * with the tools already on the page.
 */

export const JUDGE_COMPANY = "IndieTerminal";

export const JUDGE_DECISION =
  "Should /research and /scan run without a Clerk session?";

export const JUDGE_ORIGIN = "https://decisionarena.vercel.app";

/**
 * The only line a judge copies into ChatGPT.
 */
export const JUDGE_PROMPT = `Open ${JUDGE_ORIGIN}/arena in this chat's browser (Sol or Terra, site tools on). Do not sign in. Do not use the in-page composer.

IndieTerminal is already loaded. The live question is the heading. Call these tools in order. Keep every reply short. Do not write an essay.

1. stress_test_decision with question: "${JUDGE_DECISION}"
   Wait until five dissenters have written on the page (about 30 seconds). Weigh it up should show a verdict.
   Then, in this chat, list each dissenter in one line: seat, FOR or AGAINST, their claim. That recap should land as soon as the seats finish. Do not stall.

2. get_current_decision
   Read the structured claims and the verdict. Then a short analysis only: who is strongest, what evidence is thin, what would flip it, what the next move is. Under 8 lines.

3. confirm_commit
   This needs founder confirmation — human-in-the-loop. ChatGPT proposes; the founder commits. One sentence.

4. share_decision with destination "link"
   Return the public /share URL.

5. get_company_brain
   The Brain page opens. One sentence on what IndieTerminal is.

6. get_decision_history
   History opens.

7. get_founder_track_record
   Calibration opens.

Then click WebMCP in the header. Confirm 17 tools and that the call log matches what you just did. Then click Floor.

If getTools() is empty, stay on /arena with site tools on and try again.`;

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open Dissent",
    detail:
      "Go to decisionarena.vercel.app. Click Open IndieTerminal. Do not sign in. The live question is already the heading. The dissenters have not written yet.",
  },
  {
    n: "02",
    title: "Paste this once",
    detail: "One prompt. Copy it into ChatGPT. Do not paste anything else.",
  },
  {
    n: "03",
    title: "Watch it walk the product",
    detail:
      "Seats write for about 30 seconds. ChatGPT recaps them, proposes a commit, then opens Brain, History, Calibration, and WebMCP. confirm_commit waits for the founder.",
  },
] as const;

/** What each call does on the page. Not extra prompts. */
export const JUDGE_CALLS = [
  {
    tool: "stress_test_decision",
    happens: "Wait. Five dissenters write. Weigh it up. Recap each seat in one line.",
  },
  {
    tool: "get_current_decision",
    happens: "Short analysis: scores, flip conditions, next move.",
  },
  {
    tool: "confirm_commit",
    happens: "Founder confirms. ChatGPT proposes; you close it.",
  },
  {
    tool: "share_decision",
    happens: "A public /share URL. The record left the chat.",
  },
  {
    tool: "get_company_brain",
    happens: "Opens Brain.",
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
