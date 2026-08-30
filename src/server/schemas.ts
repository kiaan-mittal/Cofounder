import { z } from "zod";

/**
 * Request schemas shared by the debate routes.
 *
 * The workspace lives in the browser, so the client sends the slice of it that
 * a given round needs. These schemas are the contract for that hand-off.
 */

const provenanceSchema = z.object({
  kind: z.enum(["website", "github", "docs", "founder", "inferred"]),
  ref: z.string().optional(),
  quote: z.string().optional(),
});

export const brainSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  product: z.object({
    name: z.string(),
    description: z.string(),
    features: z.array(z.string()),
    maturity: z.enum(["prototype", "alpha", "beta", "launched", "unclear"]),
    roadmapSignals: z.array(z.string()),
  }),
  market: z.object({
    icp: z.string(),
    problems: z.array(z.string()),
    positioning: z.string(),
    alternatives: z.array(z.string()),
    pricing: z.string().nullable(),
  }),
  technical: z.object({
    stack: z.array(z.string()),
    architectureNotes: z.string(),
    repoStructure: z.array(z.string()),
    activitySignals: z.array(z.string()),
  }),
  facts: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      provenance: provenanceSchema,
    }),
  ),
  assumptions: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      rationale: z.string(),
      risk: z.enum(["low", "medium", "high"]),
      status: z.enum(["unverified", "challenged", "validated", "invalidated"]),
      provenance: provenanceSchema,
    }),
  ),
  openQuestions: z.array(z.string()),
  degraded: z.boolean(),
  gaps: z.array(z.string()),
  generatedAt: z.string(),
});

export const patternSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  domain: z.enum([
    "growth",
    "revenue",
    "timeline",
    "technical",
    "retention",
    "distribution",
    "other",
    "commitment",
  ]),
  insight: z.string(),
  confidence: z.number(),
  magnitude: z.number().optional(),
  sampleSize: z.number(),
  decisionIds: z.array(z.string()),
  detectedAt: z.string(),
});

export const historyEntrySchema = z.object({
  question: z.string(),
  status: z.string(),
  chosenOption: z.string().nullable(),
  outcome: z
    .object({
      result: z.string(),
      summary: z.string(),
      lesson: z.string(),
    })
    .nullable(),
  predictions: z.array(
    z.object({
      expectedValue: z.number(),
      actualValue: z.number().nullable(),
      unit: z.string(),
    }),
  ),
});

export const debateContextSchema = z.object({
  brain: brainSchema,
  question: z.string().min(8).max(400),
  founderContext: z.string().max(3000).default(""),
  patterns: z.array(patternSchema).default([]),
  history: z.array(historyEntrySchema).default([]),
});

export const argumentForPromptSchema = z.object({
  id: z.string(),
  perspective: z.string(),
  stance: z.string(),
  claim: z.string(),
  reasoning: z.string(),
  strength: z.number(),
  status: z.string(),
});
