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
import { currentChannel, type ArenaTool } from "@/webmcp/registry";
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
      "Read the living decision model: every claim, evidence, risk, assumption, and the links between them, plus freehand ink. Call this before you add anything.",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} },
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
      "Put one object onto the shared decision canvas. Only five kinds exist: claim, evidence, risk, assumption, decision. The founder sees this appear as a node they can link, not as a chat reply. Prefer this over add_argument.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: KINDS },
        text: { type: "string", description: "One sentence." },
        x: { type: "number" },
        y: { type: "number" },
        stance: { type: "string", enum: ["+", "-", "~"] },
        connect_to: {
          type: "string",
          description: "Node id to link to, or decision-root.",
        },
        link_kind: { type: "string", enum: LINKS },
      },
      required: ["kind", "text"],
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
        author: "agent",
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
          author: "agent",
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
      "Draw a link between two objects on the canvas: supports, counters, depends, or handoff. Use counters when you are challenging a founder claim.",
    inputSchema: {
      type: "object",
      properties: {
        from_id: { type: "string" },
        to_id: { type: "string" },
        kind: { type: "string", enum: LINKS },
      },
      required: ["from_id", "to_id"],
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
        author: "agent",
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
      "After a founder hands you a node, put your work back on the canvas as a new object linked to it. Then the handoff is complete.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: KINDS },
        text: { type: "string" },
        node_id: {
          type: "string",
          description: "The node you were handed. Defaults to the open handoff.",
        },
      },
      required: ["kind", "text"],
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
        author: "agent",
        channel: currentChannel(),
      });
      state.addCanvasNode(node);
      state.addCanvasLink(
        makeCanvasLink({
          decisionId: id,
          fromId: target,
          toId: node.id,
          kind: "handoff",
          author: "agent",
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
