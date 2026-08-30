import { NextResponse } from "next/server";
import { z } from "zod";

import { reassessAfterDefense } from "@/server/debate";
import { handleRouteError, parseBody } from "@/server/http";
import { argumentForPromptSchema, debateContextSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  context: debateContextSchema,
  arguments: z.array(argumentForPromptSchema).min(1),
  defense: z.string().min(2).max(4000),
  targetArgumentId: z.string().nullable().default(null),
  arenaConfidence: z.number().min(0).max(100),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, bodySchema);
    const round = await reassessAfterDefense(input);
    return NextResponse.json(round);
  } catch (error) {
    return handleRouteError(error);
  }
}
