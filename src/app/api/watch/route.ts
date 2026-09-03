import { z } from "zod";

import { isWatchSnapshot } from "@/lib/watch-snapshot";
import { fail, handleRouteError, parseBody } from "@/server/http";
import { createWatch } from "@/server/watches";

export const runtime = "nodejs";

const bodySchema = z.object({
  snapshot: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, bodySchema);
    if (!isWatchSnapshot(body.snapshot)) {
      return fail("That is not a floor Dissent can publish.");
    }
    const watch = await createWatch(body.snapshot, request);
    return Response.json(watch);
  } catch (error) {
    return handleRouteError(error);
  }
}
