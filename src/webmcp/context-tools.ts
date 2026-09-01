"use client";

import { arenaVerdict } from "@/lib/arena-verdict";
import { detectPatterns, warningsForDecision } from "@/lib/calibration";
import { calibrationSnapshot, decisionHistory, decisionSnapshot, openRisksFor, activeDecision } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import { toolError, toolResult } from "@/webmcp/spec";
import type { ArenaTool } from "@/webmcp/registry";

/**
 * Context tools — everything an agent needs to understand the workspace
 * before it says anything.
 *
 * These are the tools that make Decision Arena worth building on WebMCP. An
 * agent without them can only read rendered text; with them it reads the same
 * structured decision record the founder is looking at, including provenance,
 * argument strengths and measured calibration history.
 */

function state() {
  return useArena.getState();
}

function requireDecision(decisionId?: unknown) {
  const s = state();
  if (typeof decisionId === "string" && decisionId) {
    const found = s.decisions.find((d) => d.id === decisionId);
    return found ?? null;
  }
  return activeDecision(s);
}

export const contextTools: ArenaTool[] = [
  {
    name: "get_company_brain",
    group: "context",
    humanLabel: "Read the Company Brain",
    description:
      "Read the Company Brain: what this company builds, who it sells to, its stack, and — critically — the separation between FACTS drawn from the founder's website and repository, and ASSUMPTIONS the company is betting on without proof. The dossier is verbatim excerpts from the pages that were scraped — quote those instead of inventing prices or features. Call this before making any argument. Facts carry source quotes; assumptions carry ids you can cite when you challenge them.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: [
            "all",
            "product",
            "market",
            "technical",
            "facts",
            "assumptions",
            "dossier",
          ],
          description: "Narrow the response to one section. Defaults to all.",
        },
      },
    },
    execute: ({ section }) => {
      const company = state().company;
      if (!company) {
        return toolError(
          "No Company Brain exists yet. The founder has not completed onboarding.",
        );
      }

      const { brain } = company;
      const sections: Record<string, unknown> = {
        product: brain.product,
        market: brain.market,
        technical: brain.technical,
        facts: brain.facts,
        assumptions: brain.assumptions,
        dossier: brain.dossier ?? [],
      };

      if (typeof section === "string" && section !== "all" && sections[section]) {
        return toolResult(
          `Company Brain — ${section} for ${company.name}.`,
          sections[section],
        );
      }

      return toolResult(`Company Brain for ${company.name}.`, {
        company: company.name,
        website: company.website,
        github: company.github,
        headline: brain.headline,
        summary: brain.summary,
        ...sections,
        openQuestions: brain.openQuestions,
        dossier: brain.dossier ?? [],
        degraded: brain.degraded,
        gaps: brain.gaps,
      });
    },
  },

  {
    name: "get_current_decision",
    group: "context",
    humanLabel: "Read the open decision",
    description:
      "Read a decision record as the founder sees it on the floor: the question, options, every seat opening (claim, reasoning, basis), founder defenses in full, and each seat's reassessment including the full reply — not just a verdict. Also returns risks, evidence, contradictions, action items, predictions, and what is still unpaid. Pass decision_id from get_decision_history to load a past arena; omit it to read the round the founder currently has open. Errors if they are on the arena list with nothing open.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        decision_id: {
          type: "string",
          description:
            "A past or open decision id from get_decision_history. Defaults to the round the founder currently has open.",
        },
      },
    },
    execute: ({ decision_id }) => {
      const decision = requireDecision(decision_id);
      if (!decision) {
        return toolError(
          "There is no decision open in the Arena right now. Call get_decision_history and pass a decision_id.",
        );
      }
      const snapshot = decisionSnapshot(state(), decision.id);
      const verdict = arenaVerdict(state(), decision.id);
      return toolResult(`Decision: ${decision.question}`, {
        ...snapshot,
        verdict,
      });
    },
  },

  {
    name: "get_arena_verdict",
    group: "context",
    humanLabel: "Read the arena verdict",
    description:
      "Read the decision matrix on the table right now: whether the seats are deadlocked, which way the weight leans, the strongest for and against claims, open contradictions, outstanding evidence, and the one thing that would change the call. Not an opinion — arithmetic on what is already written. Call this after stress_test_decision. Then tell the founder the unresolved questions. You still cannot confirm_commit.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        decision_id: {
          type: "string",
          description: "Defaults to the open decision.",
        },
      },
    },
    execute: ({ decision_id }) => {
      const decision = requireDecision(decision_id);
      if (!decision) {
        return toolError(
          "There is no decision open. Call stress_test_decision first.",
        );
      }
      const verdict = arenaVerdict(state(), decision.id);
      if (!verdict) {
        return toolError("There is no decision open.");
      }
      return toolResult(
        verdict.deadlock
          ? `Deadlock. ${verdict.deadlockNote}`
          : verdict.leaningLabel,
        verdict,
      );
    },
  },

  {
    name: "get_decision_history",
    group: "context",
    humanLabel: "Read past decisions",
    description:
      "Index of every arena this founder has run: question, status, chosen option, predictions, outcome, and a floor summary (seat claims, defense and reply counts). Use a returned id with get_current_decision to load that arena as a full record. Set include_record to true to attach the full floor dataset on each entry in one call.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        only_with_outcomes: {
          type: "boolean",
          description: "Return only decisions whose real outcome is known.",
        },
        include_record: {
          type: "boolean",
          description:
            "Attach the full floor record (openings, defenses, seat replies) to each entry. Defaults to false; prefer get_current_decision with a decision_id when you only need one arena.",
        },
      },
    },
    execute: ({ only_with_outcomes, include_record }) => {
      const history = decisionHistory(state(), include_record === true);
      const filtered = only_with_outcomes
        ? history.filter((h) => h.outcome !== null)
        : history;
      if (filtered.length === 0) {
        return toolResult(
          "No decisions on record yet. Do not infer past behaviour you cannot see.",
          [],
        );
      }
      raiseHistoryAlert("get_decision_history", "history");
      return toolResult(`${filtered.length} decisions on record.`, filtered);
    },
  },

  {
    name: "get_founder_patterns",
    group: "context",
    humanLabel: "Read founder calibration patterns",
    description:
      "Read the founder's measured decision patterns — for example a tendency to overestimate growth by 2.1x across five predictions, or to defer commitment. Each pattern is arithmetic over recorded predictions and real outcomes, not an opinion, so you can quote the numbers. Use these to challenge a specific claim the founder has just made, not as a general character assessment.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description:
            "Filter to one domain: growth, revenue, timeline, technical, retention, distribution, commitment.",
        },
      },
    },
    execute: ({ domain }) => {
      const patterns = livePatterns();
      const filtered =
        typeof domain === "string" && domain
          ? patterns.filter((p) => p.domain === domain)
          : patterns;
      if (filtered.length === 0) {
        return toolResult(
          "No calibration patterns yet — this founder has too few evaluated predictions. Do not invent a track record.",
          [],
        );
      }
      raiseHistoryAlert("get_founder_patterns", "calibration", filtered);
      return toolResult(`${filtered.length} measured patterns.`, filtered);
    },
  },

  {
    name: "get_open_risks",
    group: "context",
    humanLabel: "Read open risks",
    description:
      "Read the risks still open on a decision, ordered by severity. A risk stays open until the founder mitigates or explicitly accepts it. Check this before adding a risk of your own so you sharpen an existing one instead of duplicating it.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        decision_id: { type: "string", description: "Defaults to the open decision." },
      },
    },
    execute: ({ decision_id }) => {
      const decision = requireDecision(decision_id);
      if (!decision) return toolError("There is no decision open in the Arena.");
      const risks = openRisksFor(state(), decision.id);
      return toolResult(
        `${risks.length} open risks on "${decision.question}".`,
        risks.map((r) => ({
          id: r.id,
          title: r.title,
          detail: r.detail,
          severity: r.severity,
          likelihood: r.likelihood,
          raisedBy: r.createdBy,
        })),
      );
    },
  },

  {
    name: "get_predictions",
    group: "context",
    humanLabel: "Read predictions",
    description:
      "Read the founder's measurable predictions: what they expected, by when, how confident they were, and — where the deadline has passed and an outcome was recorded — what actually happened. Pending predictions show what the founder is currently on the hook for.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "pending", "hit", "missed", "partial"],
          description: "Defaults to all.",
        },
      },
    },
    execute: ({ status }) => {
      const predictions = state().predictions;
      const filtered =
        typeof status === "string" && status !== "all" && status
          ? predictions.filter((p) => p.status === status)
          : predictions;
      return toolResult(`${filtered.length} predictions.`, filtered);
    },
  },

  {
    name: "get_calibration",
    group: "context",
    humanLabel: "Read the calibration profile",
    description:
      "Read the founder's calibration profile: accuracy per estimate domain, the mean ratio between what they expected and what happened, and how many outcomes each score rests on. If `reliable` is false the sample is too small to argue from — say so rather than overstating it.",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} },
    execute: () =>
      toolResult("Founder calibration profile.", calibrationSnapshot(state())),
  },
];

function livePatterns() {
  const s = state();
  if (!s.company) return s.patterns;
  const next = detectPatterns(s.company.id, s.predictions, s.decisions);
  const same =
    s.patterns.length === next.length &&
    s.patterns.every((pattern, index) => pattern.insight === next[index]?.insight);
  if (!same) s.setPatterns(next);
  return same ? s.patterns : next;
}

function raiseHistoryAlert(
  tool: string,
  source: "history" | "calibration",
  patterns = livePatterns(),
) {
  const s = state();
  const current = activeDecision(s);
  const warning = warningsForDecision(current?.question ?? "", patterns)[0];
  if (warning) {
    s.raisePatternAlert({
      title: "Pattern detected",
      body: warning.insight,
      source,
      tool,
    });
    return;
  }
  const history = decisionHistory(s);
  const repeat = current
    ? history.find(
        (entry) =>
          entry.question !== current.question &&
          shareDecisionShape(entry.question, current.question),
      )
    : null;
  if (repeat) {
    s.raisePatternAlert({
      title: "Pattern detected",
      body: `You have been here before: “${repeat.question}” (${repeat.status}). Defend why this time is different.`,
      source: "history",
      tool,
    });
  }
}

function shareDecisionShape(a: string, b: string) {
  const tokens = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 3),
    );
  const left = tokens(a);
  const right = tokens(b);
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  return overlap >= 2;
}
