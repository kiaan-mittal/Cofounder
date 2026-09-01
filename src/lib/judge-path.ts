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

export const JUDGE_PROMPT =
  "Use Decision Arena to stress-test whether /research and /scan should run without a Clerk session.";

export const JUDGE_STEPS = [
  {
    n: "01",
    title: "Open the Arena",
    detail: "IndieTerminal is already loaded. A live decision is on the table.",
  },
  {
    n: "02",
    title: "Say this in ChatGPT",
    detail: JUDGE_PROMPT,
  },
  {
    n: "03",
    title: "Watch the tools",
    detail: "The table fills. Then try confirm_commit — the page says no.",
  },
] as const;

/** Spoken examples a judge can copy. The agent calls the tool. */
export const JUDGE_CALLS = [
  {
    tool: "stress_test_decision",
    say: JUDGE_PROMPT,
    happens: "Five seats write on the table. No click.",
  },
  {
    tool: "confirm_commit",
    say: "Now confirm_commit that decision.",
    happens: "Refused. Agents propose. Founders commit.",
  },
  {
    tool: "share_decision",
    say: "Share this decision as a public link.",
    happens: "A /share URL. The record left the chat.",
  },
] as const;
