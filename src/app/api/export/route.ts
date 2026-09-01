import { z } from "zod";

import { briefToMarkdown, isDecisionBrief } from "@/lib/decision-brief";
import { composioConfigured } from "@/server/composio";
import {
  connectedExportToolkits,
  exportViaComposio,
  needsExportAuth,
  startExportConnect,
  type ExportToolkit,
} from "@/server/composio-export";
import { appOrigin } from "@/server/app-url";
import { readGithubSession, readProjectCookie, safeReturnTo } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";
import { createDecisionShare } from "@/server/shares";

export const runtime = "nodejs";

const bodySchema = z.object({
  destination: z.enum(["link", "slack", "notion"]),
  brief: z.unknown(),
  decisionId: z.string().optional(),
  channel: z.string().optional(),
  parent: z.string().optional(),
  returnTo: z.string().optional(),
});

async function connectResponse(input: {
  request: Request;
  userId: string;
  toolkit: ExportToolkit;
  returnTo: string;
  share: { url: string; token: string };
  error?: string;
}) {
  const origin = appOrigin(input.request);
  const callback = new URL("/api/export/callback", `${origin}/`);
  callback.searchParams.set("toolkit", input.toolkit);
  callback.searchParams.set("returnTo", input.returnTo);
  const connection = await startExportConnect(
    input.userId,
    input.toolkit,
    callback.toString(),
  );
  if (!connection.redirectUrl) {
    return fail(
      "Composio did not return a connect URL. Try again in a moment.",
      502,
    );
  }
  return Response.json({
    url: input.share.url,
    token: input.share.token,
    needsConnect: true,
    connectUrl: connection.redirectUrl,
    error: input.error,
  });
}

export async function POST(request: Request) {
  try {
    const session = await readGithubSession();
    if (!session) return fail("Sign in to export a decision.", 401);
    const body = await parseBody(request, bodySchema);
    if (!isDecisionBrief(body.brief)) {
      return fail("That is not a decision brief the Arena can export.");
    }

    const share = await createDecisionShare({
      brief: body.brief,
      userLogin: session.login,
      projectId: await readProjectCookie(),
      decisionId: body.decisionId ?? null,
      request,
    });
    const markdown = briefToMarkdown(body.brief, share.url);

    if (body.destination === "link") {
      return Response.json({ url: share.url, token: share.token });
    }

    if (!composioConfigured()) {
      return fail(
        "Add COMPOSIO_API_KEY to send this decision to Slack or Notion.",
        400,
        "The share link still works.",
      );
    }

    const toolkit = body.destination as ExportToolkit;
    const userId = session.composioUserId || `da_export_${session.login}`;
    const returnTo = safeReturnTo(body.returnTo, "/arena");
    const connected = await connectedExportToolkits(userId);

    if (!connected.includes(toolkit)) {
      return connectResponse({
        request,
        userId,
        toolkit,
        returnTo,
        share,
      });
    }

    const sent = await exportViaComposio({
      userId,
      toolkit,
      title: body.brief.question,
      markdown,
      channel: body.channel,
      parent: body.parent,
    });

    if (!sent.ok) {
      if (needsExportAuth(sent.error)) {
        return connectResponse({
          request,
          userId,
          toolkit,
          returnTo,
          share,
          error: sent.error,
        });
      }
      const crashed = /maximum call stack/i.test(sent.error ?? "");
      return fail(
        crashed
          ? "Slack or Notion answered in a shape the Arena could not read."
          : sent.error || "Could not send this decision.",
        400,
        `The share link still works: ${share.url}`,
      );
    }

    return Response.json({
      url: share.url,
      token: share.token,
      exported: toolkit,
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return fail(
        "Could not finish sending. Copy the share link instead.",
        500,
      );
    }
    return handleRouteError(error);
  }
}
