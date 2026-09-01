"use client";

import {
  CANVAS_ROOT,
  defaultLinkKind,
  makeCanvasLink,
  makeCanvasNode,
  nextClaimSeat,
} from "@/lib/canvas-model";
import { useArena } from "@/lib/store";
import type { CanvasKind, CanvasLinkKind } from "@/lib/types";
import { currentChannel, actorFromChannel, type ArenaTool } from "@/webmcp/registry";
import { toolError, toolResult } from "@/webmcp/spec";

const KINDS: CanvasKind[] = [
  "claim",
  "evidence",
  "risk",
  "assumption",
  "decision",
];
const LINKS: CanvasLinkKind[] = ["supports", "counters", "depends", "handoff"];

function boardId() {
  const state = useArena.getState();
  return state.activeDecisionId || state.company?.id || null;
}

function visibleNodes() {
  const state = useArena.getState();
  const ids = new Set(
    [state.activeDecisionId, state.company?.id].filter((id): id is string =>
      Boolean(id),
    ),
  );
  return (state.canvasNodes ?? []).filter((node) => ids.has(node.decisionId));
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function spotlight(targetId: string) {
  useArena.getState().spotlight(targetId);
  setTimeout(() => {
    if (useArena.getState().spotlightId === targetId) {
      useArena.getState().spotlight(null);
    }
  }, 6000);
}

export const canvasTools: ArenaTool[] = [
  {
    name: "get_canvas",
    group: "context",
    humanLabel: "Read the decision canvas",
    description:
      "Returns the living decision model on the canvas: every claim, evidence item, risk and assumption, the links between them, and any open handoff. Node text is written by the founder and by other agents at the table.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    execute: () => {
      const id = boardId();
      if (!id) return toolError("There is no canvas open.");
      const state = useArena.getState();
      const nodes = visibleNodes();
      const links = (state.canvasLinks ?? []).filter(
        (link) => link.decisionId === id || link.decisionId === state.company?.id,
      );
      return toolResult(`Canvas has ${nodes.length} objects and ${links.length} links.`, {
        nodes: nodes.map((node) => ({
          id: node.id,
          kind: node.kind,
          text: node.text,
          author: node.author,
          stance: node.stance,
          x: node.x,
          y: node.y,
        })),
        links: links.map((link) => ({
          id: link.id,
          from: link.fromId,
          to: link.toId,
          kind: link.kind,
        })),
        handoff: state.handoff,
      });
    },
  },
  {
    name: "add_canvas_node",
    group: "debate",
    humanLabel: "Add an object to the canvas",
    description:
      "Adds one object to the shared decision canvas and links it to an existing node, or to the decision root by default. It appears on the founder's canvas as a node they can move and link, attributed to the caller. Returns the new node id.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: KINDS,
          description: "What sort of object this is.",
        },
        text: { type: "string", description: "The object itself, one sentence." },
        x: {
          type: "number",
          description: "Left edge, 0-100. Omit to let the canvas seat it.",
        },
        y: {
          type: "number",
          description: "Top edge, 0-100. Omit to let the canvas seat it.",
        },
        stance: {
          type: "string",
          enum: ["+", "-", "~"],
          description:
            "Whether the object argues for the decision, against it, or is neutral.",
        },
        connect_to: {
          type: "string",
          description:
            "Id of the node to link this to. Defaults to the decision root.",
        },
        link_kind: {
          type: "string",
          enum: LINKS,
          description:
            "How the new object relates to the node it links to. Inferred from kind when omitted.",
        },
      },
      required: ["kind", "text"],
      additionalProperties: false,
    },
    execute: (args) => {
      const id = boardId();
      if (!id) return toolError("There is no canvas open.");
      const kind = KINDS.includes(args.kind as CanvasKind)
        ? (args.kind as CanvasKind)
        : "claim";
      const text = str(args.text);
      if (!text) return toolError("Write one sentence.");
      const nodes = visibleNodes();
      const seat =
        typeof args.x === "number" && typeof args.y === "number"
          ? { x: args.x, y: args.y }
          : nextClaimSeat(nodes);
      const node = makeCanvasNode({
        decisionId: id,
        kind,
        text,
        x: Math.max(2, Math.min(80, seat.x)),
        y: Math.max(18, Math.min(82, seat.y)),
        author: actorFromChannel(),
        stance:
          args.stance === "+" || args.stance === "-" || args.stance === "~"
            ? args.stance
            : undefined,
        channel: currentChannel(),
      });
      const state = useArena.getState();
      state.addCanvasNode(node);
      const target = str(args.connect_to, CANVAS_ROOT);
      const linkKind = LINKS.includes(args.link_kind as CanvasLinkKind)
        ? (args.link_kind as CanvasLinkKind)
        : defaultLinkKind(kind, target === CANVAS_ROOT ? "decision" : "claim");
      state.addCanvasLink(
        makeCanvasLink({
          decisionId: id,
          fromId: node.id,
          toId: target,
          kind: linkKind,
          author: actorFromChannel(),
        }),
      );
      spotlight(node.id);
      return toolResult(`Added a ${kind} to the canvas.`, {
        nodeId: node.id,
        text,
      });
    },
  },
  {
    name: "connect_nodes",
    group: "debate",
    humanLabel: "Link two canvas objects",
    description:
      "Draws a link between two objects already on the canvas, recording whether one supports, counters, depends on, or is handed off to the other. The edge appears on the founder's canvas immediately. Returns the new link id.",
    inputSchema: {
      type: "object",
      properties: {
        from_id: {
          type: "string",
          description: "Id of the node the link starts at.",
        },
        to_id: {
          type: "string",
          description: "Id of the node the link points to.",
        },
        kind: {
          type: "string",
          enum: LINKS,
          description:
            "The relationship the link records. Defaults to counters.",
        },
      },
      required: ["from_id", "to_id"],
      additionalProperties: false,
    },
    execute: (args) => {
      const id = boardId();
      if (!id) return toolError("There is no canvas open.");
      const from = str(args.from_id);
      const to = str(args.to_id);
      if (!from || !to) return toolError("Need both ends of the link.");
      const kind = LINKS.includes(args.kind as CanvasLinkKind)
        ? (args.kind as CanvasLinkKind)
        : "counters";
      const link = makeCanvasLink({
        decisionId: id,
        fromId: from,
        toId: to,
        kind,
        author: actorFromChannel(),
      });
      useArena.getState().addCanvasLink(link);
      spotlight(link.id);
      return toolResult(`Linked ${from} → ${to} (${kind}).`, { linkId: link.id });
    },
  },
  {
    name: "return_work",
    group: "debate",
    humanLabel: "Return handed-off work",
    description:
      "Closes an open handoff by adding the finished work to the canvas as a new object linked back to the node the founder handed over. Returns the new node id and clears the handoff.",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: KINDS,
          description: "What sort of object the returned work is.",
        },
        text: {
          type: "string",
          description: "The finished work, in one sentence.",
        },
        node_id: {
          type: "string",
          description:
            "Id of the node that was handed over. Defaults to the open handoff.",
        },
      },
      required: ["kind", "text"],
      additionalProperties: false,
    },
    execute: (args) => {
      const id = boardId();
      if (!id) return toolError("There is no canvas open.");
      const state = useArena.getState();
      const target = str(args.node_id, state.handoff?.nodeId ?? "");
      if (!target) return toolError("Nothing was handed off.");
      const parent = (state.canvasNodes ?? []).find((node) => node.id === target);
      const text = str(args.text);
      if (!text) return toolError("Put the work in one sentence.");
      const kind = KINDS.includes(args.kind as CanvasKind)
        ? (args.kind as CanvasKind)
        : "claim";
      const node = makeCanvasNode({
        decisionId: id,
        kind,
        text,
        x: Math.min(80, (parent?.x ?? 40) + 8),
        y: Math.min(82, (parent?.y ?? 40) + 16),
        author: actorFromChannel(),
        channel: currentChannel(),
      });
      state.addCanvasNode(node);
      state.addCanvasLink(
        makeCanvasLink({
          decisionId: id,
          fromId: target,
          toId: node.id,
          kind: "handoff",
          author: actorFromChannel(),
        }),
      );
      state.setHandoff(
        state.handoff
          ? { ...state.handoff, status: "returned", returnedText: text }
          : null,
      );
      spotlight(node.id);
      return toolResult("Returned work to the canvas.", { nodeId: node.id });
    },
  },
];
