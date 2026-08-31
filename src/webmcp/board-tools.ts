"use client";

import { makeDrawing, makeNote, nextNoteSeat } from "@/lib/board";
import { useArena } from "@/lib/store";
import type { BoardShape } from "@/lib/types";
import { currentChannel, actorFromChannel, type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

const SHAPES: BoardShape[] = [
  "circle",
  "underline",
  "cross",
  "check",
  "arrow",
  "scribble",
];

function boardId() {
  const state = useArena.getState();
  return state.activeDecisionId || state.company?.id || null;
}

function visibleMarks() {
  const state = useArena.getState();
  const ids = new Set(
    [state.activeDecisionId, state.company?.id].filter((id): id is string => Boolean(id)),
  );
  return state.boardMarks.filter((mark) => ids.has(mark.decisionId));
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function spotlight(targetId: string) {
  useArena.getState().spotlight(targetId);
  setTimeout(() => {
    if (useArena.getState().spotlightId === targetId) {
      useArena.getState().spotlight(null);
    }
  }, 6000);
}

export const boardTools: ArenaTool[] = [
  {
    name: "get_board",
    group: "context",
    humanLabel: "Read the shared table",
    description:
      "Read every note, stroke and drawing currently on the shared table — what the founder wrote in blue and what you or the Arena wrote in red. Call this before you write, so you do not stack ink on top of an existing mark.",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} },
    execute: () => {
      const id = boardId();
      if (!id) return toolError("There is no table open.");
      const marks = visibleMarks();
      return toolResult(`The table has ${marks.length} marks.`, {
        marks: marks.map((mark) => ({
          id: mark.id,
          kind: mark.kind,
          author: mark.author,
          text: mark.text,
          shape: mark.shape,
          x: mark.x,
          y: mark.y,
        })),
      });
    },
  },
  {
    name: "write_on_board",
    group: "debate",
    humanLabel: "Write on the table",
    description:
      "Write a note onto the shared table in your ink. The founder sees this appear as handwriting on the board, not as a chat message. Use this for the one sentence they must answer. Prefer this over add_argument when you want them to see you at the table.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "One or two sentences. What you are writing." },
        x: { type: "number", description: "0-100. Left edge. Optional — the table will seat it." },
        y: { type: "number", description: "0-100. Top edge. Optional." },
      },
      required: ["text"],
    },
    execute: (args) => {
      const id = boardId();
      if (!id) return toolError("There is no table open.");
      const text = str(args.text);
      if (!text) return toolError("Write something.");
      const state = useArena.getState();
      const seat =
        typeof args.x === "number" && typeof args.y === "number"
          ? { x: args.x, y: args.y }
          : nextNoteSeat(visibleMarks());
      const mark = makeNote({
        decisionId: id,
        text,
        x: Math.max(2, Math.min(86, seat.x)),
        y: Math.max(2, Math.min(82, seat.y)),
        author: actorFromChannel(),
        channel: currentChannel(),
      });
      state.addBoardMark(mark);
      spotlight(mark.id);
      return toolResult("Wrote on the table.", { markId: mark.id, text });
    },
  },
  {
    name: "draw_on_board",
    group: "debate",
    humanLabel: "Draw on the table",
    description:
      "Draw on the shared table: circle something, underline it, put a cross through it, a check next to it, an arrow, or a scribble. This is how you mark the board the way a cofounder would with a red pen. Use it after write_on_board, or to mark a note the founder already wrote.",
    inputSchema: {
      type: "object",
      properties: {
        shape: {
          type: "string",
          enum: SHAPES,
          description: "circle, underline, cross, check, arrow, or scribble.",
        },
        x: { type: "number", description: "0-100. Where the drawing starts." },
        y: { type: "number", description: "0-100." },
        w: { type: "number", description: "Width 4-40. Defaults to 16." },
        h: { type: "number", description: "Height 4-40. Defaults to 12." },
      },
      required: ["shape", "x", "y"],
    },
    execute: (args) => {
      const id = boardId();
      if (!id) return toolError("There is no table open.");
      const shape = SHAPES.includes(args.shape as BoardShape)
        ? (args.shape as BoardShape)
        : "circle";
      const mark = makeDrawing({
        decisionId: id,
        shape,
        x: Math.max(1, Math.min(90, num(args.x, 40))),
        y: Math.max(1, Math.min(90, num(args.y, 40))),
        w: Math.max(6, Math.min(40, num(args.w, 16))),
        h: Math.max(6, Math.min(40, num(args.h, 12))),
        author: actorFromChannel(),
        channel: currentChannel(),
      });
      useArena.getState().addBoardMark(mark);
      spotlight(mark.id);
      return toolResult(`Drew a ${shape} on the table.`, { markId: mark.id });
    },
  },
];
