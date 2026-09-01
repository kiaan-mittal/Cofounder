import { z } from "zod";

import { isDecisionBrief } from "@/lib/decision-brief";
import { readGithubSession, readProjectCookie } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";
import { createDecisionShare } from "@/server/shares";

export const runtime = "nodejs";

const bodySchema = z.object({
  brief: z.unknown(),
  decisionId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in to share a decision.", 401);

    const body = await parseBody(request, bodySchema);
    if (!isDecisionBrief(body.brief)) {
      return fail("That is not a decision brief the Arena can share.");
    }

    const created = await createDecisionShare({
      brief: body.brief,
      userLogin: session.login,
      projectId: await readProjectCookie(),
      decisionId: body.decisionId ?? null,
      request,
    });
    return Response.json(created);
  } catch (error) {
    return handleRouteError(error);
  }
}
