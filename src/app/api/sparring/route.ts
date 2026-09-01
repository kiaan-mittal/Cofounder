import { NextResponse } from "next/server";
import { z } from "zod";

import type { SparringPlanEvent } from "@/lib/reading";
import { handleRouteError, parseBody } from "@/server/http";
import { generateStructured } from "@/server/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * One step of the in-page sparring agent.
 *
 * The server never touches the workspace. It receives the tool schemas the
 * page advertised through WebMCP plus the results of previous calls, and
 * returns a single decision: call this tool with these arguments, or stop and
 * say this. The browser performs the call through `executeTool`.
 */

const bodySchema = z.object({
  goal: z.string().min(3).max(2000),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        inputSchema: z.unknown(),
      }),
    )
    .min(1),
  transcript: z
    .array(
      z.object({
        tool: z.string(),
        args: z.record(z.unknown()),
        result: z.string(),
      }),
    )
    .default([]),
  stepsRemaining: z.number().min(0).max(24),
  closeOut: z.boolean().optional(),
});

const stepSchema = z.object({
  reasoning: z
    .string()
    .max(400)
    .describe(
      "One or two sentences the founder will read, explaining what you are doing and why. Write it to them, not about them.",
    ),
  action: z.enum(["call_tool", "respond"]),
  tool: z
    .string()
    .nullable()
    .describe("Exact tool name when action is call_tool, otherwise null."),
  argsJson: z
    .string()
    .nullable()
    .describe(
      "A JSON object of arguments matching the tool's inputSchema, serialised as a string. Null when responding.",
    ),
  message: z
    .string()
    .nullable()
    .describe("Your closing remark to the founder when action is respond."),
});

const SYSTEM = `You are an external AI agent that has just connected to a live web page called Decision Arena. The page has exposed a set of WebMCP tools, listed below. You are not the page's own assistant and you have no other access to it — reading and changing this workspace is only possible through these tools.

A founder is in the middle of a consequential decision. Your job is to be the sparring partner they cannot get anywhere else.

How to work:
1. If they ask you to decide, launch, spend, hire, raise, pick a market, or put something in the Arena, call stress_test_decision with their question. Do not ask them to click. The table fills while you wait. It returns the verdict — tell them the deadlock, the strongest attack, and what would change the call.
2. Otherwise read first. Call get_company_brain and get_current_decision. Use the dossier excerpts and fact quotes — do not invent prices or features. If history or patterns tools exist, read those before you claim a pattern.
3. Write into the shared arena state. Prefer add_argument, add_risk, flag_contradiction, request_evidence.
4. Then speak. The message field is the chat reply the founder reads. Three to six short sentences: what you found, what you put on the record, what they should do next. Do not list tool names, dump JSON, or recap every call. Tools are shown beside the message.
5. You may propose a commitment. You cannot confirm_commit.
6. If they say share, send a link, Slack, or Notion, call share_decision with the matching destination. Always leave them the public URL. If it returns a connectUrl, tell them to open it. The point is the record left the chat.

Hard rules:
- Never flatter. Never open with praise. Never say "great question".
- Never assert a pattern or history you have not read from a tool. If get_founder_track_record returns no patterns, the founder has no track record yet and you must say so instead of inventing one.
- Quote real numbers from the dossier and fact quotes in your arguments, not raw ids. Never invent a price.
- Reasoning is one short sentence while you work. The founder sees it as a status line, not the answer.`;

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, bodySchema);

    const toolList = input.tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  inputSchema: ${JSON.stringify(tool.inputSchema)}`,
      )
      .join("\n");

    const transcript = input.transcript.length
      ? input.transcript
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.tool}(${JSON.stringify(entry.args)})\n→ ${entry.result}`,
          )
          .join("\n\n")
      : "You have not called any tools yet.";

    const prompt = [
      "TOOLS EXPOSED BY THIS PAGE VIA WebMCP:",
      toolList,
      "",
      "WHAT YOU HAVE DONE SO FAR:",
      transcript,
      "",
      `THE FOUNDER'S REQUEST: ${input.goal}`,
      "",
      input.closeOut
        ? "Close this turn now. Do not call another tool. Write the founder-facing answer from what you already have."
        : `You have ${input.stepsRemaining} step(s) left. Decide your single next action.`,
    ].join("\n");

    const wantsStream = request.headers.get("accept")?.includes("text/event-stream");
    if (!wantsStream) {
      const step = await generateStructured({
        schema: stepSchema,
        system: SYSTEM,
        prompt,
        purpose: "Planning the sparring agent's next move",
      });
      return NextResponse.json(step);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SparringPlanEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        try {
          const step = await generateStructured({
            schema: stepSchema,
            system: SYSTEM,
            prompt,
            purpose: "Planning the sparring agent's next move",
            onPartial: (value) => {
              const partial = value as {
                reasoning?: string;
                message?: string | null;
              };
              if (!partial.reasoning && !partial.message) return;
              send({
                type: "partial",
                reasoning: partial.reasoning,
                message: partial.message ?? undefined,
              });
            },
          });
          send({ type: "done", step });
        } catch (error) {
          const handled = handleRouteError(error);
          const payload = await handled.json().catch(() => null);
          send({
            type: "error",
            message:
              payload?.error ??
              "The sparring agent could not reach its model.",
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
