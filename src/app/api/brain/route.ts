import { z } from "zod";

import type { BrainBuildEvent } from "@/lib/reading";
import { buildCompanyFromSources } from "@/server/build-company";
import { readGithubSession } from "@/server/github-oauth";
import { fail, handleRouteError, parseBody } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  website: z.string().max(400).default(""),
  github: z.string().max(400).default(""),
  docsUrl: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, bodySchema);

    if (!input.website.trim() && !input.github.trim()) {
      return fail(
        "Give the Arena at least one source to read: a website or a repository.",
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: BrainBuildEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          if (input.website.trim()) send({ type: "stage", stage: "website" });
          if (input.github.trim()) send({ type: "stage", stage: "github" });

          const githubSession = await readGithubSession();

          const built = await buildCompanyFromSources(
            {
              website: input.website,
              github: input.github,
              docsUrl: input.docsUrl,
              accessToken: githubSession?.accessToken || undefined,
              composioUserId: githubSession?.composioUserId,
            },
            {
              onExcerpt: (excerpt) => send({ type: "excerpt", excerpt }),
              onStage: (stage) => send({ type: "stage", stage }),
            },
          );

          if (!built.ok) {
            send({
              type: "error",
              message: built.message,
              hint: built.hint,
            });
            controller.close();
            return;
          }

          send({ type: "done", company: built.company });
        } catch (error) {
          const handled = handleRouteError(error);
          const payload = await handled.json().catch(() => null);
          send({
            type: "error",
            message:
              payload?.error ??
              "Something went wrong while reading your sources.",
            hint: payload?.hint,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
