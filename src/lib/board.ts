import { id, now } from "@/lib/id";
import type {
  Actor,
  AgentChannel,
  Argument,
  ArgumentStance,
  BoardMark,
  BoardShape,
} from "@/lib/types";

const NOTE_SEATS = [
  { x: 6, y: 10 },
  { x: 38, y: 8 },
  { x: 68, y: 12 },
  { x: 8, y: 40 },
  { x: 40, y: 44 },
  { x: 70, y: 42 },
  { x: 18, y: 70 },
  { x: 52, y: 68 },
];

export function nextNoteSeat(marks: BoardMark[]): { x: number; y: number } {
  const used = marks.filter((mark) => mark.kind === "note").length;
  return NOTE_SEATS[used % NOTE_SEATS.length];
}

export function stanceShape(stance: ArgumentStance): BoardShape {
  if (stance === "for") return "check";
  if (stance === "against") return "cross";
  return "underline";
}

export function makeNote(input: {
  decisionId: string;
  text: string;
  x: number;
  y: number;
  author: Actor;
  channel?: AgentChannel;
}): BoardMark {
  return {
    id: id("mark"),
    decisionId: input.decisionId,
    kind: "note",
    x: input.x,
    y: input.y,
    text: input.text,
    author: input.author,
    channel: input.channel,
    createdAt: now(),
  };
}

export function makeStroke(input: {
  decisionId: string;
  points: BoardMark["points"];
  author: Actor;
  channel?: AgentChannel;
}): BoardMark {
  return {
    id: id("mark"),
    decisionId: input.decisionId,
    kind: "stroke",
    x: input.points?.[0]?.x ?? 0,
    y: input.points?.[0]?.y ?? 0,
    points: input.points,
    author: input.author,
    channel: input.channel,
    createdAt: now(),
  };
}

export function makeDrawing(input: {
  decisionId: string;
  shape: BoardShape;
  x: number;
  y: number;
  w?: number;
  h?: number;
  author: Actor;
  channel?: AgentChannel;
}): BoardMark {
  return {
    id: id("mark"),
    decisionId: input.decisionId,
    kind: "drawing",
    shape: input.shape,
    x: input.x,
    y: input.y,
    w: input.w ?? 16,
    h: input.h ?? 12,
    author: input.author,
    channel: input.channel,
    createdAt: now(),
  };
}

export function marksForArgument(
  argument: Pick<Argument, "decisionId" | "claim" | "stance" | "createdBy" | "channel">,
  marks: BoardMark[],
): BoardMark[] {
  const seat = nextNoteSeat(marks);
  const note = makeNote({
    decisionId: argument.decisionId,
    text: argument.claim,
    x: seat.x,
    y: seat.y,
    author: argument.createdBy,
    channel: argument.channel,
  });
  const stamp = makeDrawing({
    decisionId: argument.decisionId,
    shape: stanceShape(argument.stance),
    x: Math.min(88, seat.x + 18),
    y: Math.max(2, seat.y - 2),
    w: 10,
    h: 10,
    author: argument.createdBy,
    channel: argument.channel,
  });
  return [note, stamp];
}

/** Seat each argument in turn so later ones do not land on earlier ink. */
export function landArguments(
  argumentsToLand: Array<
    Pick<Argument, "decisionId" | "claim" | "stance" | "createdBy" | "channel">
  >,
  existing: BoardMark[],
): BoardMark[] {
  const acc = [...existing];
  const out: BoardMark[] = [];
  for (const argument of argumentsToLand) {
    const marks = marksForArgument(argument, acc);
    out.push(...marks);
    acc.push(...marks);
  }
  return out;
}
