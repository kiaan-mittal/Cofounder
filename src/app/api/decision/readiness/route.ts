import { NextResponse } from "next/server";
import { z } from "zod";

import { summariseReadiness } from "@/server/debate";
import { handleRouteError, parseBody } from "@/server/http";
import { argumentForPromptSchema, debateContextSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  context: debateContextSchema,
  arguments: z.array(argumentForPromptSchema).min(1),
  risks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
      status: z.string(),
    }),
  ),
  founderConfidence: z.number().min(0).max(100),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, bodySchema);
    const summary = await summariseReadiness(input);
    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
