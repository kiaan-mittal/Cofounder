"use client";

import { arenaVerdict } from "@/lib/arena-verdict";
import { detectPatterns, warningsForDecision } from "@/lib/calibration";
import { inheritedRoomPayload } from "@/lib/inherited-room";
import { openWorkspacePage } from "@/lib/open-page";
import { calibrationSnapshot, decisionHistory, decisionSnapshot, activeDecision } from "@/lib/selectors";
import { useArena } from "@/lib/store";
import { rememberGuestWorkspace } from "@/lib/supabase/sync";
import { currentChannel, type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

/**
 * Context tools — everything an agent needs to understand the workspace
 * before it says anything.
 *
 * These are the tools that make Dissent worth building on WebMCP. An
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
    name: "the_room",
    group: "context",
    humanLabel: "The room you inherited",
    description:
      "You already inherited this room. This description is replaced live with the company, the open decision, and what still blocks commit. Call only for a structured refresh — getTools already contains the same text.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    execute: () => {
      const payload = inheritedRoomPayload();
      if (!payload.company) {
        return toolError(
          "No Company Brain exists yet. The founder has not completed onboarding.",
        );
      }
      return toolResult(payload.line, payload);
    },
  },

  {
    name: "get_company_brain",
    group: "context",
    humanLabel: "Read the Company Brain",
    description:
      "Opens the Brain page, then returns the Company Brain: what the company builds, who it sells to, its stack, and the split between facts drawn from the founder's website and repository and assumptions it is betting on without proof. Facts carry source quotes; assumptions carry ids. The dossier holds verbatim excerpts from the scraped pages.",
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
      required: [],
      additionalProperties: false,
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

      if (currentChannel() !== "founder") {
        openWorkspacePage("/brain");
      }

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
      "Returns one decision record as the founder sees it: the question, options, every dissenter as a structured claim (position, strength, claim, evidence, risk, reversibility), and the floor verdict: FOR/AGAINST split, dimension scores (evidence, confidence, risk, reversibility, upside), flip conditions, next move, and what still blocks commit.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        decision_id: {
          type: "string",
          description:
            "A past or open decision id, as returned by get_decision_history. Defaults to the decision the founder has open.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: ({ decision_id }) => {
      const decision = requireDecision(decision_id);
      if (!decision) {
        return toolError(
          "There is no decision open on the floor right now. Call get_decision_history and pass a decision_id.",
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
    name: "get_decision_history",
    group: "context",
    humanLabel: "Read past decisions",
    description:
      "Opens the History page, then returns an index of every decision this founder has run, newest first: question, status, chosen option, predictions, outcome, and a floor summary of dissenter claims. Each entry carries a decision id that get_current_decision accepts.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
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
            "Attach the full floor record — openings, defenses and seat replies — to every entry. Defaults to false, which returns summaries only.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: ({ only_with_outcomes, include_record }) => {
      rememberGuestWorkspace();
      const history = decisionHistory(state(), include_record === true);
      const filtered = only_with_outcomes
        ? history.filter((h) => h.outcome !== null)
        : history;
      if (filtered.length === 0) {
        return toolResult("No decisions on record yet.", {
          decisions: [],
          note: "This founder has run no decisions, so there is no decision history to read.",
        });
      }
      raiseHistoryAlert("get_decision_history", "history");
      if (currentChannel() !== "founder") {
        openWorkspacePage("/history");
      }
      return toolResult(`${filtered.length} decisions on record.`, filtered);
    },
  },

  {
    name: "get_founder_track_record",
    group: "context",
    humanLabel: "Read the founder's track record",
    description:
      "Opens the Calibration page, then returns everything measured about how this founder estimates: their patterns, such as overestimating growth by 2.1x across five predictions; their calibration profile per domain with the sample size each score rests on; and every prediction with what was expected and what actually happened. A domain whose reliable flag is false has too few outcomes to conclude from.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          enum: [
            "growth",
            "revenue",
            "timeline",
            "technical",
            "retention",
            "distribution",
            "commitment",
          ],
          description: "Filter to a single estimate domain. Defaults to all.",
        },
        prediction_status: {
          type: "string",
          enum: ["all", "pending", "hit", "missed", "partial"],
          description: "Filter the predictions by status. Defaults to all.",
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: ({ domain, prediction_status }) => {
      const s = state();
      const patterns = livePatterns();
      const scopedPatterns =
        typeof domain === "string" && domain
          ? patterns.filter((p) => p.domain === domain)
          : patterns;
      const predictions =
        typeof prediction_status === "string" &&
        prediction_status &&
        prediction_status !== "all"
          ? s.predictions.filter((p) => p.status === prediction_status)
          : s.predictions;

      if (scopedPatterns.length) {
        raiseHistoryAlert(
          "get_founder_track_record",
          "calibration",
          scopedPatterns,
        );
      }

      if (currentChannel() !== "founder") {
        openWorkspacePage("/calibration");
      }

      return toolResult(
        `${scopedPatterns.length} measured patterns over ${predictions.length} predictions.`,
        {
          patterns: scopedPatterns,
          calibration: calibrationSnapshot(s),
          predictions,
          note: scopedPatterns.length
            ? undefined
            : "Too few evaluated predictions to measure a pattern yet.",
        },
      );
    },
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
