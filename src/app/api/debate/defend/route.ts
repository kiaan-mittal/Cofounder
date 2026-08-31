import type { DebateDefendEvent } from "@/lib/reading";
import { reassessAfterDefense } from "@/server/debate";
import { handleRouteError, parseBody } from "@/server/http";
import { argumentForPromptSchema, debateContextSchema } from "@/server/schemas";
import { z } from "zod";

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
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: DebateDefendEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          send({ type: "started" });
          const round = await reassessAfterDefense(input, (partial) => {
            const reassessments = (partial.reassessments ?? []).filter(
              (item): item is NonNullable<typeof item> =>
                Boolean(item?.argumentId) &&
                Boolean(item.reply || item.verdict || item.addressed),
            );
            if (!reassessments.length) return;
            send({
              type: "partial",
              reassessments: reassessments.map((item) => ({
                argumentId: item.argumentId,
                verdict: item.verdict,
                addressed: item.addressed,
                unaddressed: item.unaddressed,
                reply: item.reply,
                strengthDelta: item.strengthDelta,
              })),
            });
          });
          send({ type: "done", round });
        } catch (error) {
          const handled = handleRouteError(error);
          const payload = await handled.json().catch(() => null);
          send({
            type: "error",
            message:
              payload?.error ??
              "The seats could not finish this round.",
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
