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

export const JUDGE_ORIGIN = "https://trydissent.vercel.app";

/**
 * The only line a judge copies into ChatGPT.
 */
export const JUDGE_PROMPT = `Open Dissent and stress-test whether /research and /scan should run without a Clerk session. Read the resulting verdict, propose the strongest next move, and let me retain final authority over the commitment. Before committing, ask me what to commit — do not call confirm_commit until I say so. Then share the public decision link with me so I can view it and share it.`;

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open Dissent",
    detail:
      "Go to trydissent.vercel.app. Click Open IndieTerminal. Do not sign in. The live question is already the heading. The dissenters have not written yet.",
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
    happens: "Ask what to commit. Do not close it until the founder says so.",
  },
  {
    tool: "share_decision",
    happens: "A public /share URL you can open and send.",
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
