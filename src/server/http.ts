import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";

import { LlmUnavailableError } from "@/server/llm";

/**
 * Route plumbing. Every failure leaves here as a plain sentence the founder
 * can act on — the Arena should never render a raw stack trace at someone who
 * is in the middle of a decision.
 */

export interface ApiError {
  error: string;
  hint?: string;
}

export function fail(message: string, status = 400, hint?: string) {
  return NextResponse.json<ApiError>({ error: message, hint }, { status });
}

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const json = await request.json().catch(() => {
    throw new ZodError([]);
  });
  return schema.parse(json);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(
      "The request was missing something the Arena needs.",
      422,
      error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
    );
  }
  if (error instanceof LlmUnavailableError) {
    const schemaMiss = /did not match schema|no object generated/i.test(
      error.message,
    );
    return fail(
      error.message,
      503,
      schemaMiss
        ? "The model answered, but not in the shape the Arena expected. Try the build again."
        : "If this keeps happening, check OPENAI_API_KEY in .env.local.",
    );
  }
  const detail = error instanceof Error ? error.message : String(error);
  return fail("The Arena hit an unexpected problem.", 500, detail);
}
