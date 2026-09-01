import type { DebateOpenEvent } from "@/lib/reading";
import { openingRound } from "@/server/debate";
import { handleRouteError, parseBody } from "@/server/http";
import { debateContextSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, debateContextSchema);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: DebateOpenEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          send({ type: "started" });
          const round = await openingRound(input, {
            onFrame: (frame) => send({ type: "frame", frame }),
            onArgument: (argument) =>
              send({
                type: "perspective",
                perspective: argument.perspective,
                argument,
              }),
          });
          send({ type: "done", round });
        } catch (error) {
          const handled = handleRouteError(error);
          const payload = await handled.json().catch(() => null);
          send({
            type: "error",
            message:
              payload?.error ??
              "The Arena could not open this round.",
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
