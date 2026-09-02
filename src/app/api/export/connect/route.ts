import { z } from "zod";

import { appOrigin } from "@/server/app-url";
import { composioConfigured } from "@/server/composio";
import {
  EXPORT_TOOLKITS,
  startExportConnect,
  type ExportToolkit,
} from "@/server/composio-export";
import { resolveExportUser } from "@/server/export-identity";
import { safeReturnTo } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  toolkit: z.enum(EXPORT_TOOLKITS),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    if (!composioConfigured()) {
      return fail("Sign in to send this decision to Slack or Notion.", 401);
    }

    const { userId } = await resolveExportUser();
    const body = await parseBody(request, bodySchema);
    const toolkit = body.toolkit as ExportToolkit;
    const returnTo = safeReturnTo(body.returnTo, "/arena");
    const origin = appOrigin(request);
    const callback = new URL("/api/export/callback", `${origin}/`);
    callback.searchParams.set("toolkit", toolkit);
    callback.searchParams.set("returnTo", returnTo);
    const connection = await startExportConnect(
      userId,
      toolkit,
      callback.toString(),
    );
    if (!connection.redirectUrl) {
      return fail("Composio did not return a connect URL. Try again.");
    }
    return Response.json({
      redirectUrl: connection.redirectUrl,
      connectionId: connection.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
