import "server-only";

import { z } from "zod";

import { warningsForDecision } from "@/lib/calibration";
import { PERSPECTIVES } from "@/lib/perspectives";
import type { CompanyBrain, FounderPattern, PerspectiveId } from "@/lib/types";
import { brainDigest } from "@/server/brain";
import { fastModels, generateStructured } from "@/server/llm";

/**
 * The debate engine.
 *
 * Two rules run through every prompt here. Arguments must be about *this*
 * company, quoting the Brain by id. And the Arena is never rewarded for
 * agreeing — a defense that only addresses part of an objection must be
 * acknowledged as partial, not accepted.
 */

const ANTI_SYCOPHANCY = `You are not an assistant and you are not here to be liked. You are the founder's second chair.

Hard rules:
- Never open with praise. Never write "great point", "you're absolutely right", "that's a fair challenge", or any variant.
- Never hedge with "it depends" or "both options have merit". Take a position and carry the cost of it.
- Generic startup advice is a failure. If an argument could be pasted into any other company's decision, delete it and write a real one.
- Ground every argument in the Company Brain. Cite fact and assumption ids in the basis field. When the SOURCE DOSSIER lists a price, plan, feature or customer claim, use that wording. Never invent a price the dossier does not contain. If you have no grounding, say plainly that you are inferring, and mark the basis type as "inference".
- Attack the strongest version of the founder's position, not a weak caricature of it.
- Length is not rigour. Two precise sentences beat a paragraph of qualification.`;

const PERSPECTIVE_IDS = [
  "technical",
  "product",
  "gtm",
  "financial",
  "contrarian",
] as const;

const basisSchema = z.object({
  type: z.enum(["fact", "assumption", "pattern", "inference"]),
  ref: z
    .string()
    .optional()
    .describe("The id from the Company Brain or pattern list, e.g. fact_a1b2c3d4."),
  label: z.string().describe("Short human-readable note about what this leans on."),
});

const argumentSchema = z.object({
  perspective: z.enum(PERSPECTIVE_IDS),
  stance: z.enum(["for", "against", "conditional"]),
  claim: z.string().describe("One sentence. The assertion itself, stated flatly."),
  reasoning: z
    .string()
    .describe("Two to four sentences of specific support drawn from this company's context."),
  basis: z.array(basisSchema),
  strength: z
    .number()
    .min(0)
    .max(100)
    .describe("How much weight this argument deserves given the evidence behind it."),
});

const riskSchema = z.object({
  title: z.string(),
  detail: z.string(),
  severity: z.number().min(1).max(5),
  likelihood: z.enum(["low", "medium", "high"]),
  perspective: z.enum(PERSPECTIVE_IDS).nullable(),
});

const contradictionSchema = z.object({
  summary: z.string().describe("One line naming the tension."),
  sideA: z.string().describe("The first thing the founder appears to believe or have said."),
  sideB: z.string().describe("The second belief or plan that cannot hold at the same time."),
});

/* ------------------------------------------------------------------ */
/* Round 1 — the opening challenge                                     */
/* ------------------------------------------------------------------ */

const openingFrameSchema = z.object({
  contextNote: z
    .string()
    .describe("Two sentences restating what is actually at stake, in the company's own terms."),
  options: z
    .array(z.object({ label: z.string(), detail: z.string() }))
    .describe("The real, mutually exclusive choices — including the one the founder has not named."),
  arenaConfidence: z
    .number()
    .min(0)
    .max(100)
    .describe("How confident the Arena is that the founder's apparent preference is correct."),
  risks: z.array(riskSchema),
  contradictions: z.array(contradictionSchema),
  evidenceRequests: z
    .array(z.string())
    .describe("Specific things the founder could check that would settle a disagreement."),
});

const openingSchema = openingFrameSchema.extend({
  arguments: z.array(argumentSchema),
});

export type OpeningRound = z.infer<typeof openingSchema>;

function patternDigest(patterns: FounderPattern[]): string {
  if (patterns.length === 0) {
    return "No calibration history yet — this founder has no evaluated predictions on record. Do not invent past behaviour.";
  }
  return [
    "FOUNDER CALIBRATION (measured from recorded predictions and real outcomes — cite by id):",
    ...patterns.map(
      (p) =>
        `- [${p.id}] (${p.domain}, ${p.sampleSize} outcomes, confidence ${p.confidence}%) ${p.insight}`,
    ),
  ].join("\n");
}

function historyDigest(history: HistoryEntry[]): string {
  if (history.length === 0) return "No previous decisions on record.";
  return [
    "PREVIOUS DECISIONS:",
    ...history.slice(0, 10).map((h) => {
      const outcome = h.outcome
        ? `outcome: ${h.outcome.result} — ${h.outcome.lesson}`
        : "outcome: not yet recorded";
      const predictions = h.predictions
        .map(
          (p) =>
            `predicted ${p.expectedValue} ${p.unit}${
              p.actualValue !== null ? `, actual ${p.actualValue}` : ", pending"
            }`,
        )
        .join("; ");
      return `- "${h.question}" → ${h.status}${h.chosenOption ? ` (${h.chosenOption})` : ""}; ${outcome}${predictions ? `; ${predictions}` : ""}`;
    }),
  ].join("\n");
}

export interface HistoryEntry {
  question: string;
  status: string;
  chosenOption: string | null;
  outcome: { result: string; summary: string; lesson: string } | null;
  predictions: Array<{
    expectedValue: number;
    actualValue: number | null;
    unit: string;
  }>;
}

export interface DebateContext {
  brain: CompanyBrain;
  question: string;
  founderContext: string;
  patterns: FounderPattern[];
  history: HistoryEntry[];
}

export async function openingRound(
  context: DebateContext,
  onEvent?: {
    onFrame?: (frame: z.infer<typeof openingFrameSchema>) => void;
    onArgument?: (argument: z.infer<typeof argumentSchema>) => void;
  },
): Promise<OpeningRound> {
  const shared = debatePrompt(context);

  const framePromise = generateOpeningFrame(context, shared).then((frame) => {
    onEvent?.onFrame?.(frame);
    return frame;
  });

  const argumentPromises = PERSPECTIVES.map((perspective) =>
    generateOpeningArgument(context, shared, perspective.id).then((argument) => {
      onEvent?.onArgument?.(argument);
      return argument;
    }),
  );

  const [frame, ...generated] = await Promise.all([
    framePromise,
    ...argumentPromises,
  ]);

  return {
    ...frame,
    arguments: generated,
  };
}

function debatePrompt(context: DebateContext): string {
  const warnings = warningsForDecision(context.question, context.patterns);
  return [
    brainDigest(context.brain),
    "",
    patternDigest(context.patterns),
    "",
    historyDigest(context.history),
    "",
    `THE DECISION: ${context.question}`,
    warnings.length
      ? `CALIBRATION WARNING — SAY THIS ON THE FLOOR IF IT FITS. Quote the numbers. Do not invent a pattern.\n${warnings
          .map((pattern) => `- ${pattern.insight}`)
          .join("\n")}`
      : "",
    context.founderContext
      ? `FOUNDER'S OWN FRAMING: ${context.founderContext}`
      : "The founder gave no extra context.",
  ].join("\n");
}

async function generateOpeningFrame(
  context: DebateContext,
  shared: string,
): Promise<z.infer<typeof openingFrameSchema>> {
  try {
    const raw = await generateStructured({
      schema: openingFrameSchema,
      schemaName: "OpeningFrame",
      system: `${ANTI_SYCOPHANCY}

You are framing the opening of a Decision Arena session. Name the real mutually exclusive options, the material risks, any contradiction you can actually support, and the specific checks that would settle the disagreement. Do not write the five specialist arguments.

Set arenaConfidence honestly. If the founder's instinct looks right, say so with a high number and still name the costs.`,
      prompt: `${shared}\n\nFrame the round. Two or three options. Two to four risks. At most two contradictions.`,
      purpose: "Framing the Arena round",
      models: fastModels(),
      timeoutMs: 35_000,
      normalize: normalizeOpeningFrame,
    });
    const fallback = fallbackFrame(context);
    return {
      ...raw,
      contextNote: raw.contextNote || fallback.contextNote,
      options: (raw.options.length >= 2 ? raw.options : fallback.options).slice(0, 3),
      risks: (raw.risks.length > 0 ? raw.risks : fallback.risks).slice(0, 4),
      contradictions: raw.contradictions.slice(0, 2),
      evidenceRequests: raw.evidenceRequests.slice(0, 3),
    };
  } catch {
    return fallbackFrame(context);
  }
}

async function generateOpeningArgument(
  context: DebateContext,
  shared: string,
  perspective: PerspectiveId,
): Promise<z.infer<typeof argumentSchema>> {
  const meta = PERSPECTIVES.find((item) => item.id === perspective);
  try {
    const raw = await generateStructured({
      schema: argumentSchema,
      schemaName: "ArenaArgument",
      system: `${ANTI_SYCOPHANCY}

You write exactly one argument from a single seat: ${meta?.name ?? perspective}.
Remit: ${meta?.remit ?? ""}
Focus: ${meta?.focus.join(", ") ?? ""}.

Take a hard stance. Do not write a both-sides paragraph.
Seat rules:
- contrarian: stance is against. You are here to break the founder's preferred path.
- financial: default against spending or launching until unit economics are in the dossier.
- technical: against if the work is months; conditional if it is days.
- product: for only if a named user in the Brain would feel the difference this month.
- gtm: for only if a distribution channel is in the Brain; otherwise against.

If the founder is asking to spend money or launch, this seat's claim should make them uncomfortable unless the dossier already proves the bet.

Speak only from this remit. Cite fact and assumption ids in basis when you have them.`,
      prompt: `${shared}\n\nWrite the ${meta?.name ?? perspective} argument. One claim, two to four sentences of reasoning, and at least one basis entry. Stance must be for, against, or conditional — pick one and carry it.`,
      purpose: `Writing the ${meta?.name ?? perspective} argument`,
      models: fastModels(),
      timeoutMs: 35_000,
      normalize: (value) => normalizeArgument(value, perspective),
    });
    return { ...raw, perspective };
  } catch {
    return fallbackArgument(context, perspective);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeArgument(
  value: unknown,
  perspective: PerspectiveId,
): z.infer<typeof argumentSchema> {
  const record = asRecord(value);
  const stance = ["for", "against", "conditional"].includes(String(record.stance))
    ? (record.stance as "for" | "against" | "conditional")
    : "conditional";
  const basis = (Array.isArray(record.basis) ? record.basis : [])
    .map((item) => {
      const entry = asRecord(item);
      const type = ["fact", "assumption", "pattern", "inference"].includes(
        String(entry.type),
      )
        ? (entry.type as "fact" | "assumption" | "pattern" | "inference")
        : "inference";
      const label = asString(entry.label);
      if (!label) return null;
      return {
        type,
        label,
        ...(asString(entry.ref) ? { ref: asString(entry.ref) } : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 3);

  return {
    perspective,
    stance,
    claim: asString(record.claim, "This decision is not yet grounded enough to take."),
    reasoning: asString(record.reasoning),
    basis:
      basis.length > 0
        ? basis
        : [{ type: "inference", label: "No Brain id was attached." }],
    strength: asNumber(record.strength, 50, 0, 100),
  };
}

function normalizeOpeningFrame(value: unknown): z.infer<typeof openingFrameSchema> {
  const record = asRecord(value);
  const options = (Array.isArray(record.options) ? record.options : [])
    .map((item) => {
      const option = asRecord(item);
      const label = asString(option.label);
      if (!label) return null;
      return { label, detail: asString(option.detail) };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    contextNote: asString(record.contextNote),
    options:
      options.length >= 2
        ? options
        : [
            { label: "Proceed", detail: "Take the founder's apparent preference." },
            { label: "Hold", detail: "Do not add scope until the bet is cheaper to test." },
          ],
    arenaConfidence: asNumber(record.arenaConfidence, 45, 0, 100),
    risks: (Array.isArray(record.risks) ? record.risks : [])
      .map((item) => {
        const risk = asRecord(item);
        const title = asString(risk.title);
        if (!title) return null;
        const perspective = PERSPECTIVE_IDS.includes(
          risk.perspective as (typeof PERSPECTIVE_IDS)[number],
        )
          ? (risk.perspective as (typeof PERSPECTIVE_IDS)[number])
          : null;
        return {
          title,
          detail: asString(risk.detail),
          severity: asNumber(risk.severity, 3, 1, 5),
          likelihood: (["low", "medium", "high"].includes(String(risk.likelihood))
            ? risk.likelihood
            : "medium") as "low" | "medium" | "high",
          perspective,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    contradictions: (Array.isArray(record.contradictions)
      ? record.contradictions
      : []
    )
      .map((item) => {
        const contradiction = asRecord(item);
        const summary = asString(contradiction.summary);
        if (!summary) return null;
        return {
          summary,
          sideA: asString(contradiction.sideA),
          sideB: asString(contradiction.sideB),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    evidenceRequests: (Array.isArray(record.evidenceRequests)
      ? record.evidenceRequests
      : []
    )
      .map((item) => asString(item))
      .filter(Boolean),
  };
}

function fallbackFrame(context: DebateContext): z.infer<typeof openingFrameSchema> {
  return {
    contextNote: `The decision is whether ${context.question.replace(/\?$/, "")} is the right next bet for ${context.brain.headline}.`,
    options: [
      { label: "Proceed now", detail: "Take the founder's apparent preference this week." },
      { label: "Hold the line", detail: "Do not add scope until a cheaper test has landed." },
    ],
    arenaConfidence: 40,
    risks: [
      {
        title: "The Brain is thinner than the decision",
        detail:
          context.brain.gaps[0] ||
          "The available sources may not be enough to justify more scope.",
        severity: 3,
        likelihood: "medium",
        perspective: "contrarian",
      },
    ],
    contradictions: [],
    evidenceRequests: context.brain.openQuestions.slice(0, 2),
  };
}

function fallbackArgument(
  context: DebateContext,
  perspective: PerspectiveId,
): z.infer<typeof argumentSchema> {
  const assumption = context.brain.assumptions[0];
  const fact = context.brain.facts[0];
  return {
    perspective,
    stance:
      perspective === "contrarian" || perspective === "financial"
        ? "against"
        : "conditional",
    claim: `From the ${perspective} seat, this decision is only as strong as the unproven bets in the Company Brain.`,
    reasoning: assumption
      ? `${assumption.statement} That is still unverified, so adding scope is a bet on it remaining true.`
      : `${context.brain.headline} The sources do not yet prove that more features are the right next move.`,
    basis: assumption
      ? [
          {
            type: "assumption",
            ref: assumption.id,
            label: assumption.statement,
          },
        ]
      : fact
        ? [{ type: "fact", ref: fact.id, label: fact.statement }]
        : [{ type: "inference", label: "The Brain had no checkable assumption to cite." }],
    strength: 42,
  };
}

/* ------------------------------------------------------------------ */
/* Round 2+ — reassessment after the founder defends                   */
/* ------------------------------------------------------------------ */

const reassessmentSchema = z.object({
  reassessments: z
    .array(
      z.object({
        argumentId: z.string().describe("The exact id of the argument being reassessed."),
        verdict: z.enum(["conceded", "weakened", "unmoved", "reinforced"]),
        addressed: z
          .string()
          .describe("One sentence: what the founder's defense actually answered."),
        unaddressed: z
          .string()
          .describe("One sentence: the hole that is still open."),
        reply: z
          .string()
          .describe(
            "The seat speaking out loud. 80–140 words. Separate paragraphs with a blank line. Optional: up to four conditions as lines that start with '- ' (each under 22 words). First person. Quote the founder once. No 'Tech:'/'CFO:' prefix, no fact_ ids, no JSON, no spec dump. CFO: cash and runway. Tech: months and failure modes. Product: the user. GTM: who hears it. Contra: why the frame is wrong.",
          ),
        strengthDelta: z
          .number()
          .min(-45)
          .max(25)
          .describe("Change in this argument's strength. Negative when the defense landed."),
      }),
    )
    .min(1),
  newArguments: z
    .array(argumentSchema.extend({ challengesId: z.string().optional() }))
    .max(2)
    .describe("Only if the defense genuinely opened a new line of attack. Zero is a valid answer."),
  newRisks: z.array(riskSchema).max(2),
  newContradictions: z.array(contradictionSchema).max(1),
  arenaConfidence: z.number().min(0).max(100),
  arenaConfidenceRationale: z
    .string()
    .describe("One sentence explaining why the number moved, or why it did not."),
});

export type ReassessmentRound = z.infer<typeof reassessmentSchema>;

export interface ArgumentForPrompt {
  id: string;
  perspective: string;
  stance: string;
  claim: string;
  reasoning: string;
  strength: number;
  status: string;
}

export async function reassessAfterDefense(
  input: {
    context: DebateContext;
    arguments: ArgumentForPrompt[];
    defense: string;
    targetArgumentId: string | null;
    arenaConfidence: number;
  },
  onPartial?: (value: Partial<ReassessmentRound>) => void,
): Promise<ReassessmentRound> {
  const system = `${ANTI_SYCOPHANCY}

The founder just spoke. You are the seats on their board — CFO, Tech, Product, GTM, Contrarian — sitting across the table. You do not write captions. You answer.

Each reassessment is that seat talking. The reply field is what they say out loud: 80–140 words, three short paragraphs separated by blank lines. First person. Quote the founder's words once. Then one concrete objection. Then what number, date or proof would change your mind. If you have conditions, add at most four lines that start with "- ", each under 22 words — not a spec, not JSON, not "1) 2) 3)".

Never prefix with "Tech:" or "CFO:". Never cite internal ids (fact_…, asm_…). A real CFO talks runway and what they will not sign. Tech talks months, people and failure modes. Product talks the user. GTM talks who hears it. Contra says why the whole frame is wrong.

If the founder mentioned money, cost, features, or recovery, the financial seat MUST answer. Reassess every seat the defense actually hits. Two or three full answers beat five stubs.

Verdicts:
- conceded: they fully answered you. Say so, then name the residual risk.
- weakened: they moved you. Say how far, and what is still unpaid.
- unmoved: they missed you. Restate the objection in their words so they hear it.
- reinforced: their defense made your case stronger. Explain why.

addressed / unaddressed stay one sentence each. reply is the conversation.

Only add a new argument if the defense opened a new line. Zero is valid.`;

  const warnings = warningsForDecision(
    input.context.question,
    input.context.patterns,
  );
  const prompt = [
    brainDigest(input.context.brain),
    "",
    patternDigest(input.context.patterns),
    "",
    `THE DECISION: ${input.context.question}`,
    warnings.length
      ? `CALIBRATION WARNING — NAME IT IN THE REPLY IF IT FITS. Quote the numbers.\n${warnings
          .map((pattern) => `- ${pattern.insight}`)
          .join("\n")}`
      : "",
    `ARENA CONFIDENCE BEFORE THIS DEFENSE: ${input.arenaConfidence}`,
    "",
    "ARGUMENTS CURRENTLY ON THE TABLE:",
    ...input.arguments.map(
      (a) =>
        `- [${a.id}] (${a.perspective}, ${a.stance}, strength ${a.strength}, ${a.status}) ${a.claim} — ${a.reasoning}`,
    ),
    "",
    input.targetArgumentId
      ? `THE FOUNDER IS ANSWERING ARGUMENT [${input.targetArgumentId}] SPECIFICALLY.`
      : "THE FOUNDER IS ANSWERING THE ROUND AS A WHOLE.",
    `FOUNDER'S DEFENSE: ${input.defense}`,
    "",
    input.targetArgumentId
      ? "Reassess that argument first, then any others the defense also bears on."
      : "Reassess every argument this defense actually bears on. Leave the rest alone.",
  ].join("\n");

  return generateStructured({
    schema: reassessmentSchema,
    system,
    prompt,
    purpose: "Reassessing after the founder's defense",
    timeoutMs: 55_000,
    onPartial: onPartial
      ? (value) => onPartial(value as Partial<ReassessmentRound>)
      : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Decision readiness                                                  */
/* ------------------------------------------------------------------ */

const readinessSchema = z.object({
  strongestForId: z.string().nullable(),
  strongestAgainstId: z.string().nullable(),
  keyAssumptionId: z
    .string()
    .nullable()
    .describe("The Company Brain assumption whose failure would most cheaply invalidate this decision."),
  keyAssumptionNote: z.string(),
  biggestUnresolvedRisk: z.string(),
  recommendedTest: z
    .string()
    .describe("The cheapest concrete thing the founder could do this week that would meaningfully change their confidence."),
  arenaConfidence: z.number().min(0).max(100),
  verdict: z
    .string()
    .describe("Two sentences. What the Arena thinks, stated plainly, without hedging."),
});

export type ReadinessSummary = z.infer<typeof readinessSchema>;

export async function summariseReadiness(input: {
  context: DebateContext;
  arguments: ArgumentForPrompt[];
  risks: Array<{ id: string; title: string; detail: string; status: string }>;
  founderConfidence: number;
}): Promise<ReadinessSummary> {
  const system = `${ANTI_SYCOPHANCY}

The founder is about to commit. Summarise where the debate actually landed. Do not restate every argument — pick the ones that carry weight and say why.

The recommended test must be cheap, concrete and completable in about a week. "Do more research" is not a test. "Send the current build to 10 people from the waitlist and count how many finish onboarding" is.`;

  const prompt = [
    brainDigest(input.context.brain),
    "",
    `THE DECISION: ${input.context.question}`,
    `FOUNDER CONFIDENCE: ${input.founderConfidence}`,
    "",
    "ARGUMENTS:",
    ...input.arguments.map(
      (a) =>
        `- [${a.id}] (${a.perspective}, ${a.stance}, strength ${a.strength}, ${a.status}) ${a.claim}`,
    ),
    "",
    "RISKS:",
    ...input.risks.map((r) => `- [${r.id}] (${r.status}) ${r.title}: ${r.detail}`),
    "",
    "Summarise readiness. Use exact ids from the lists above.",
  ].join("\n");

  return generateStructured({
    schema: readinessSchema,
    system,
    prompt,
    purpose: "Summarising decision readiness",
    models: fastModels(),
    timeoutMs: 35_000,
  });
}
