import { z } from "zod";

import { isWatchSnapshot } from "@/lib/watch-snapshot";
import { fail, handleRouteError, parseBody } from "@/server/http";
import { readWatch, updateWatch } from "@/server/watches";

export const runtime = "nodejs";

const updateSchema = z.object({
  writeKey: z.string().min(8),
  snapshot: z.unknown(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token?.startsWith("wch_")) {
      return fail("That watch link is not valid.", 404);
    }
    const snapshot = await readWatch(token);
    if (!snapshot) return fail("This watch has not started, or it ended.", 404);
    return Response.json({ snapshot });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token?.startsWith("wch_")) {
      return fail("That watch link is not valid.", 404);
    }
    const body = await parseBody(request, updateSchema);
    if (!isWatchSnapshot(body.snapshot)) {
      return fail("That is not a floor Dissent can publish.");
    }
    const ok = await updateWatch(token, body.writeKey, body.snapshot);
    if (!ok) return fail("This watch has not started, or it ended.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
