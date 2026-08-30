import { id, now } from "@/lib/id";
import { perspectiveSeat } from "@/lib/perspectives";
import type {
  Actor,
  AgentChannel,
  Argument,
  CanvasKind,
  CanvasLink,
  CanvasLinkKind,
  CanvasNode,
  Contradiction,
  Evidence,
  PerspectiveId,
  Risk,
} from "@/lib/types";

export const CANVAS_ROOT = "decision-root";

const COLUMN_X = [4, 22.5, 41, 59.5, 78] as const;
const CLAIM_Y = 27;
const CHILD_Y = [50, 68] as const;
const ASSUME_Y = 80;

export function makeCanvasNode(input: {
  decisionId: string;
  kind: CanvasKind;
  text: string;
  x: number;
  y: number;
  author: Actor;
  stance?: CanvasNode["stance"];
  seat?: string;
  perspective?: PerspectiveId;
  sourceId?: string;
  channel?: AgentChannel;
}): CanvasNode {
  return {
    id: id("node"),
    decisionId: input.decisionId,
    kind: input.kind,
    text: shortLine(input.text),
    x: input.x,
    y: input.y,
    author: input.author,
    stance: input.stance,
    seat: input.seat,
    perspective: input.perspective,
    sourceId: input.sourceId,
    channel: input.channel,
    createdAt: now(),
  };
}

export function makeCanvasLink(input: {
  decisionId: string;
  fromId: string;
  toId: string;
  kind: CanvasLinkKind;
  author: Actor;
}): CanvasLink {
  return {
    id: id("link"),
    decisionId: input.decisionId,
    fromId: input.fromId,
    toId: input.toId,
    kind: input.kind,
    author: input.author,
    createdAt: now(),
  };
}

export function shortLine(text: string, max = 92) {
  const cut = text.replace(/\s+/g, " ").trim();
  const sentence = cut.split(/(?<=[.!?])\s/)[0] ?? cut;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function nextClaimSeat(nodes: CanvasNode[]): { x: number; y: number } {
  const claims = nodes.filter((node) => node.kind === "claim").length;
  return {
    x: COLUMN_X[claims % COLUMN_X.length],
    y: CLAIM_Y,
  };
}

export function nextChildSeat(
  parent: CanvasNode,
  existing: CanvasNode[],
): { x: number; y: number } {
  const kids = existing.filter(
    (node) => node.kind !== "claim" && Math.abs(node.x - parent.x) < 6,
  ).length;
  return {
    x: parent.x,
    y: CHILD_Y[Math.min(kids, CHILD_Y.length - 1)],
  };
}

function stanceMark(stance: Argument["stance"]): CanvasNode["stance"] {
  if (stance === "for") return "+";
  if (stance === "against") return "-";
  return "~";
}

function fingerprint(text: string) {
  return shortLine(text, 36).toLowerCase();
}

/** Turn a finished opening (or later) round into a readable tree. */
export function landRoundOnCanvas(input: {
  decisionId: string;
  existing: CanvasNode[];
  arguments: Array<
    Pick<
      Argument,
      | "id"
      | "decisionId"
      | "claim"
      | "stance"
      | "createdBy"
      | "channel"
      | "perspective"
    >
  >;
  risks: Array<Pick<Risk, "id" | "title" | "detail" | "createdBy">>;
  evidence: Array<Pick<Evidence, "id" | "statement" | "requestedBy">>;
  contradictions: Array<Pick<Contradiction, "id" | "summary" | "createdBy">>;
}): { nodes: CanvasNode[]; links: CanvasLink[] } {
  const known = new Set(
    input.existing.map((node) => node.sourceId).filter(Boolean),
  );
  const seenClaim = new Set(
    input.existing
      .filter((node) => node.kind === "claim")
      .map((node) => fingerprint(node.text)),
  );
  const seenSeat = new Set(
    input.existing.map((node) => node.seat).filter(Boolean),
  );
  const nodes: CanvasNode[] = [];
  const links: CanvasLink[] = [];
  const seated = [...input.existing];

  const uniqueArgs = input.arguments.filter((argument) => {
    if (known.has(argument.id)) return false;
    const seat = perspectiveSeat(argument.perspective);
    const print = fingerprint(argument.claim);
    if (seenClaim.has(print) || seenSeat.has(seat)) return false;
    seenClaim.add(print);
    seenSeat.add(seat);
    return true;
  });

  for (const argument of uniqueArgs) {
    const seat = nextClaimSeat(seated);
    const node = makeCanvasNode({
      decisionId: input.decisionId,
      kind: "claim",
      text: argument.claim,
      x: seat.x,
      y: seat.y,
      author: argument.createdBy,
      stance: stanceMark(argument.stance),
      seat: perspectiveSeat(argument.perspective),
      perspective: argument.perspective,
      sourceId: argument.id,
      channel: argument.channel,
    });
    nodes.push(node);
    seated.push(node);
    links.push(
      makeCanvasLink({
        decisionId: input.decisionId,
        fromId: CANVAS_ROOT,
        toId: node.id,
        kind: argument.stance === "against" ? "counters" : "supports",
        author: argument.createdBy,
      }),
    );
  }

  const claims = seated.filter((node) => node.kind === "claim");
  const usedClaim = new Set<string>();

  const against = claims.filter((node) => node.stance === "-");
  const forClaims = claims.filter((node) => node.stance !== "-");

  for (const [index, risk] of input.risks.entries()) {
    if (known.has(risk.id)) continue;
    const parent =
      against[index] ??
      claims.find((claim) => !usedClaim.has(claim.id)) ??
      claims[index % Math.max(claims.length, 1)];
    if (!parent || usedClaim.has(parent.id)) continue;
    usedClaim.add(parent.id);
    const node = makeCanvasNode({
      decisionId: input.decisionId,
      kind: "risk",
      text: risk.title,
      x: parent.x,
      y: CHILD_Y[0],
      author: risk.createdBy,
      sourceId: risk.id,
    });
    nodes.push(node);
    seated.push(node);
    links.push(
      makeCanvasLink({
        decisionId: input.decisionId,
        fromId: parent.id,
        toId: node.id,
        kind: "depends",
        author: risk.createdBy,
      }),
    );
  }

  for (const [index, item] of input.evidence.entries()) {
    if (known.has(item.id)) continue;
    const parent =
      forClaims.find((claim) => !usedClaim.has(claim.id)) ??
      claims.find((claim) => !usedClaim.has(claim.id));
    if (!parent) break;
    usedClaim.add(parent.id);
    const node = makeCanvasNode({
      decisionId: input.decisionId,
      kind: "evidence",
      text: item.statement,
      x: parent.x,
      y: CHILD_Y[0],
      author: item.requestedBy,
      sourceId: item.id,
    });
    nodes.push(node);
    seated.push(node);
    links.push(
      makeCanvasLink({
        decisionId: input.decisionId,
        fromId: node.id,
        toId: parent.id,
        kind: "supports",
        author: item.requestedBy,
      }),
    );
    if (index >= 2) break;
  }

  const tension = input.contradictions.find((item) => !known.has(item.id));
  if (tension) {
    const node = makeCanvasNode({
      decisionId: input.decisionId,
      kind: "assumption",
      text: tension.summary,
      x: 41,
      y: ASSUME_Y,
      author: tension.createdBy,
      sourceId: tension.id,
    });
    nodes.push(node);
    const left = against[0] ?? claims[0];
    if (left) {
      links.push(
        makeCanvasLink({
          decisionId: input.decisionId,
          fromId: left.id,
          toId: node.id,
          kind: "counters",
          author: tension.createdBy,
        }),
      );
    }
  }

  return { nodes, links };
}

/** Put existing objects into columns so the tree can be read. */
export function treeLayout(
  nodes: CanvasNode[],
  links: CanvasLink[],
): Array<Pick<CanvasNode, "id" | "x" | "y">> {
  const claims = nodes
    .filter((node) => node.kind === "claim")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const others = nodes.filter((node) => node.kind !== "claim");
  const patches: Array<Pick<CanvasNode, "id" | "x" | "y">> = [];

  claims.forEach((claim, index) => {
    const x = COLUMN_X[index] ?? COLUMN_X[index % COLUMN_X.length];
    patches.push({ id: claim.id, x, y: CLAIM_Y });
  });

  const claimX = new Map(
    patches.map((patch) => [patch.id, patch.x] as const),
  );

  const childCount = new Map<string, number>();
  for (const extra of others) {
    const parent = links.find(
      (link) =>
        (link.fromId === extra.id && claimX.has(link.toId)) ||
        (link.toId === extra.id && claimX.has(link.fromId)),
    );
    const parentId =
      parent && claimX.has(parent.fromId)
        ? parent.fromId
        : parent && claimX.has(parent.toId)
          ? parent.toId
          : null;
    if (extra.kind === "assumption") {
      patches.push({ id: extra.id, x: 41, y: ASSUME_Y });
      continue;
    }
    if (!parentId) {
      patches.push({
        id: extra.id,
        x: COLUMN_X[patches.length % COLUMN_X.length],
        y: CHILD_Y[1],
      });
      continue;
    }
    const used = childCount.get(parentId) ?? 0;
    childCount.set(parentId, used + 1);
    patches.push({
      id: extra.id,
      x: claimX.get(parentId) ?? 41,
      y: CHILD_Y[Math.min(used, CHILD_Y.length - 1)],
    });
  }

  return patches;
}

export function defaultLinkKind(
  from: CanvasKind | "decision",
  to: CanvasKind | "decision",
): CanvasLinkKind {
  if (from === "claim" && to === "claim") return "counters";
  if (from === "evidence") return "supports";
  if (from === "risk" || to === "risk") return "depends";
  if (from === "assumption" || to === "assumption") return "depends";
  return "supports";
}

export function seatForKind(
  kind: CanvasKind,
  perspective?: PerspectiveId,
): string | undefined {
  if (kind === "claim" && perspective) return perspectiveSeat(perspective);
  if (kind === "claim") return "Claim";
  return undefined;
}
