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
    expose: false,
    humanLabel: "Read the shared table",
    description:
      "Returns every note and drawing currently on the shared table, each with its id, author, text, shape and position. Note text is written by the founder and by other agents at the table.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
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
    expose: false,
    humanLabel: "Write on the table",
    description:
      "Adds a handwritten note to the shared table, attributed to the caller. It appears on the founder's board immediately as ink rather than as a chat message, seated automatically unless x and y are given. Returns the new mark id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The note itself, one or two sentences.",
        },
        x: {
          type: "number",
          description: "Left edge, 0-100. Omit to let the table seat the note.",
        },
        y: {
          type: "number",
          description: "Top edge, 0-100. Omit to let the table seat the note.",
        },
      },
      required: ["text"],
      additionalProperties: false,
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
    expose: false,
    humanLabel: "Draw on the table",
    description:
      "Adds a drawing to the shared table at the given position — a circle, underline, cross, check, arrow or scribble. The stroke appears on the founder's board immediately, attributed to the caller, and can mark a note that is already there. Returns the new mark id.",
    inputSchema: {
      type: "object",
      properties: {
        shape: {
          type: "string",
          enum: SHAPES,
          description:
            "Which stroke to draw: circle, underline, cross, check, arrow or scribble.",
        },
        x: {
          type: "number",
          description: "Left edge where the drawing starts, 0-100.",
        },
        y: {
          type: "number",
          description: "Top edge where the drawing starts, 0-100.",
        },
        w: { type: "number", description: "Width, 4-40. Defaults to 16." },
        h: { type: "number", description: "Height, 4-40. Defaults to 12." },
      },
      required: ["shape", "x", "y"],
      additionalProperties: false,
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
