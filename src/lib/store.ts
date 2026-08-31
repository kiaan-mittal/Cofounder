"use client";

import { create } from "zustand";

import { id, now } from "@/lib/id";
import type {
  ActionItem,
  Actor,
  AgentChannel,
  Argument,
  BoardMark,
  CanvasHandoff,
  CanvasLink,
  CanvasNode,
  Company,
  Contradiction,
  Decision,
  Defense,
  Evidence,
  FounderPattern,
  Outcome,
  PatternAlert,
  Prediction,
  Reassessment,
  Risk,
  ToolCall,
} from "@/lib/types";

/**
 * The Arena keeps its workspace in the page. Persistence is Supabase, keyed
 * by the signed-in GitHub user's selected project. WebMCP still mutates this
 * live state so the founder and an agent are looking at the same record.
 */

export interface PendingCommit {
  decisionId: string;
  optionId: string;
  optionLabel: string;
  rationale: string;
  proposedBy: AgentChannel;
  proposedAt: string;
}

export interface ArenaState {
  hydrated: boolean;

  company: Company | null;
  decisions: Decision[];
  argumentList: Argument[];
  defenses: Defense[];
  reassessments: Reassessment[];
  risks: Risk[];
  evidence: Evidence[];
  contradictions: Contradiction[];
  actionItems: ActionItem[];
  predictions: Prediction[];
  outcomes: Outcome[];
  patterns: FounderPattern[];
  toolCalls: ToolCall[];
  boardMarks: BoardMark[];
  canvasNodes: CanvasNode[];
  canvasLinks: CanvasLink[];
  handoff: CanvasHandoff | null;

  activeDecisionId: string | null;
  /** Highlighted by an agent tool call so the founder can see what changed. */
  spotlightId: string | null;
  /**
   * A commitment an agent has proposed but the founder has not confirmed.
   * Committing is the one irreversible act in the Arena, so it stays human.
   */
  pendingCommit: PendingCommit | null;
  /** Session stamps. Not persisted — they are for the founder watching now. */
  patternAlerts: PatternAlert[];
  /**
   * Bumped when the founder asks for a blank round. Not persisted.
   * The start screen watches this so + New arena still works when no
   * decision is active.
   */
  composeNonce: number;
  /**
   * True while the founder is looking at the list of arenas. Not persisted.
   * Stops a snapshot pull from putting them back inside the last round.
   */
  listingArenas: boolean;

  setCompany: (company: Company) => void;
  clearWorkspace: () => void;
  importWorkspace: (snapshot: Partial<ArenaState>) => void;

  createDecision: (
    input: Pick<Decision, "question" | "context" | "options">,
  ) => Decision;
  setActiveDecision: (decisionId: string | null) => void;
  beginNewArena: () => void;
  updateDecision: (decisionId: string, patch: Partial<Decision>) => void;

  addArgument: (argument: Argument) => void;
  addArguments: (args: Argument[]) => void;
  updateArgument: (argumentId: string, patch: Partial<Argument>) => void;

  addDefense: (defense: Defense) => void;
  addReassessments: (items: Reassessment[]) => void;
  upsertReassessment: (item: Reassessment, applyStrength?: boolean) => void;

  addRisk: (risk: Risk) => void;
  updateRisk: (riskId: string, patch: Partial<Risk>) => void;

  addEvidence: (item: Evidence) => void;
  updateEvidence: (evidenceId: string, patch: Partial<Evidence>) => void;

  addContradiction: (item: Contradiction) => void;
  resolveContradiction: (contradictionId: string, resolution: string) => void;

  addActionItem: (item: ActionItem) => void;
  toggleActionItem: (actionItemId: string) => void;

  addPrediction: (prediction: Prediction) => void;
  recordActual: (
    predictionId: string,
    actualValue: number,
  ) => Prediction | null;

  addOutcome: (outcome: Outcome) => void;
  setPatterns: (patterns: FounderPattern[]) => void;

  addBoardMark: (mark: BoardMark) => void;
  addBoardMarks: (marks: BoardMark[]) => void;
  updateBoardMark: (markId: string, patch: Partial<BoardMark>) => void;
  removeBoardMark: (markId: string) => void;
  adoptBoardMarks: (fromId: string, toId: string) => void;

  addCanvasNode: (node: CanvasNode) => void;
  addCanvasNodes: (nodes: CanvasNode[]) => void;
  updateCanvasNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
  removeCanvasNode: (nodeId: string) => void;
  addCanvasLink: (link: CanvasLink) => void;
  addCanvasLinks: (links: CanvasLink[]) => void;
  removeCanvasLink: (linkId: string) => void;
  adoptCanvas: (fromId: string, toId: string) => void;
  setHandoff: (handoff: CanvasHandoff | null) => void;

  logToolCall: (call: Omit<ToolCall, "id" | "at">) => void;
  raisePatternAlert: (alert: Omit<PatternAlert, "id" | "at">) => void;
  dismissPatternAlert: (alertId: string) => void;
  spotlight: (targetId: string | null) => void;
  proposeCommit: (proposal: PendingCommit | null) => void;
  markHydrated: () => void;
}

type WorkspaceData = Omit<
  ArenaState,
  | "hydrated"
  | "patternAlerts"
  | "composeNonce"
  | "listingArenas"
  | "setCompany"
  | "clearWorkspace"
  | "importWorkspace"
  | "createDecision"
  | "setActiveDecision"
  | "beginNewArena"
  | "updateDecision"
  | "addArgument"
  | "addArguments"
  | "updateArgument"
  | "addDefense"
  | "addReassessments"
  | "upsertReassessment"
  | "addRisk"
  | "updateRisk"
  | "addEvidence"
  | "updateEvidence"
  | "addContradiction"
  | "resolveContradiction"
  | "addActionItem"
  | "toggleActionItem"
  | "addPrediction"
  | "recordActual"
  | "addOutcome"
  | "setPatterns"
  | "addBoardMark"
  | "addBoardMarks"
  | "updateBoardMark"
  | "removeBoardMark"
  | "adoptBoardMarks"
  | "addCanvasNode"
  | "addCanvasNodes"
  | "updateCanvasNode"
  | "removeCanvasNode"
  | "addCanvasLink"
  | "addCanvasLinks"
  | "removeCanvasLink"
  | "adoptCanvas"
  | "setHandoff"
  | "logToolCall"
  | "raisePatternAlert"
  | "dismissPatternAlert"
  | "spotlight"
  | "proposeCommit"
  | "markHydrated"
>;

export type WorkspaceSnapshot = WorkspaceData;

export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  const {
    company,
    decisions,
    argumentList,
    defenses,
    reassessments,
    risks,
    evidence,
    contradictions,
    actionItems,
    predictions,
    outcomes,
    patterns,
    toolCalls,
    boardMarks,
    canvasNodes,
    canvasLinks,
    handoff,
    activeDecisionId,
    spotlightId,
    pendingCommit,
  } = useArena.getState();
  return {
    company,
    decisions,
    argumentList,
    defenses,
    reassessments: reassessments.map(
      ({ streaming: _streaming, ...item }) => item,
    ),
    risks,
    evidence,
    contradictions,
    actionItems,
    predictions,
    outcomes,
    patterns,
    toolCalls,
    boardMarks,
    canvasNodes,
    canvasLinks,
    handoff,
    activeDecisionId,
    spotlightId,
    pendingCommit,
  };
}

export function snapshotIsEmpty(snapshot: Partial<WorkspaceSnapshot>) {
  return !snapshot.company && !(snapshot.decisions && snapshot.decisions.length);
}

/** How much of a workspace is in a snapshot. Used to avoid a stale remote wipe. */
export function snapshotWeight(snapshot: Partial<WorkspaceSnapshot>) {
  return (
    (snapshot.company ? 8 : 0) +
    (snapshot.decisions?.length ?? 0) * 10 +
    (snapshot.argumentList?.length ?? 0) * 2 +
    (snapshot.predictions?.length ?? 0) +
    (snapshot.outcomes?.length ?? 0)
  );
}

const emptyWorkspace = (): WorkspaceData => ({
  company: null,
  decisions: [],
  argumentList: [],
  defenses: [],
  reassessments: [],
  risks: [],
  evidence: [],
  contradictions: [],
  actionItems: [],
  predictions: [],
  outcomes: [],
  patterns: [],
  toolCalls: [],
  boardMarks: [],
  canvasNodes: [],
  canvasLinks: [],
  handoff: null,
  activeDecisionId: null,
  spotlightId: null,
  pendingCommit: null,
});

function createArenaStore() {
  return create<ArenaState>()((set, get) => ({
  hydrated: false,
  patternAlerts: [],
  composeNonce: 0,
  listingArenas: false,
  ...emptyWorkspace(),

      setCompany: (company) => set({ company }),

      clearWorkspace: () => set({ ...emptyWorkspace(), patternAlerts: [] }),

      importWorkspace: (snapshot) =>
        set((state) => ({
          ...emptyWorkspace(),
          ...snapshot,
          hydrated: true,
          patternAlerts: [],
          composeNonce: state.composeNonce ?? 0,
          listingArenas: state.listingArenas,
          activeDecisionId: state.listingArenas
            ? null
            : (snapshot.activeDecisionId ?? null),
        })),

      createDecision: ({ question, context, options }) => {
        const company = get().company;
        const decision: Decision = {
          id: id("dec"),
          companyId: company?.id ?? "unknown",
          question,
          context,
          options,
          status: "open",
          founderConfidence: 50,
          agentConfidence: 50,
          round: 0,
          createdAt: now(),
        };
        set((state) => ({
          decisions: [decision, ...state.decisions],
          activeDecisionId: decision.id,
          listingArenas: false,
        }));
        return decision;
      },

      setActiveDecision: (decisionId) =>
        set({
          activeDecisionId: decisionId,
          listingArenas: decisionId === null,
        }),

      beginNewArena: () =>
        set((state) => ({
          activeDecisionId: null,
          listingArenas: true,
          composeNonce: (state.composeNonce ?? 0) + 1,
        })),

      updateDecision: (decisionId, patch) =>
        set((state) => ({
          decisions: state.decisions.map((d) =>
            d.id === decisionId ? { ...d, ...patch } : d,
          ),
        })),

      addArgument: (argument) =>
        set((state) => ({ argumentList: [...state.argumentList, argument] })),

      addArguments: (args) =>
        set((state) => ({ argumentList: [...state.argumentList, ...args] })),

      updateArgument: (argumentId, patch) =>
        set((state) => ({
          argumentList: state.argumentList.map((a) =>
            a.id === argumentId ? { ...a, ...patch } : a,
          ),
        })),

      addDefense: (defense) =>
        set((state) => ({ defenses: [...state.defenses, defense] })),

      addReassessments: (items) =>
        set((state) => {
          const byArgument = new Map(items.map((r) => [r.argumentId, r]));
          return {
            reassessments: [...state.reassessments, ...items],
            argumentList: state.argumentList.map((a) => {
              const r = byArgument.get(a.id);
              if (!r) return a;
              const strength = clamp(a.strength + r.strengthDelta);
              const status: Argument["status"] =
                r.verdict === "conceded"
                  ? "conceded"
                  : r.verdict === "weakened"
                    ? "weakened"
                    : r.verdict === "reinforced"
                      ? "reinforced"
                      : "unresolved";
              return { ...a, strength, status };
            }),
          };
        }),

      upsertReassessment: (item, applyStrength = false) =>
        set((state) => {
          const index = state.reassessments.findIndex(
            (entry) =>
              entry.id === item.id ||
              (entry.defenseId === item.defenseId &&
                entry.argumentId === item.argumentId),
          );
          const previous = index >= 0 ? state.reassessments[index] : undefined;
          const reassessments = [...state.reassessments];
          const next = previous ? { ...previous, ...item } : item;
          if (index >= 0) reassessments[index] = next;
          else reassessments.push(next);

          const shouldApply =
            applyStrength &&
            next.strengthDelta !== 0 &&
            previous?.streaming !== false;

          if (!shouldApply) return { reassessments };

          return {
            reassessments,
            argumentList: state.argumentList.map((argument) => {
              if (argument.id !== next.argumentId) return argument;
              const strength = clamp(argument.strength + next.strengthDelta);
              const status: Argument["status"] =
                next.verdict === "conceded"
                  ? "conceded"
                  : next.verdict === "weakened"
                    ? "weakened"
                    : next.verdict === "reinforced"
                      ? "reinforced"
                      : "unresolved";
              return { ...argument, strength, status };
            }),
          };
        }),

      addRisk: (risk) => set((state) => ({ risks: [...state.risks, risk] })),

      updateRisk: (riskId, patch) =>
        set((state) => ({
          risks: state.risks.map((r) =>
            r.id === riskId ? { ...r, ...patch } : r,
          ),
        })),

      addEvidence: (item) =>
        set((state) => ({ evidence: [...state.evidence, item] })),

      updateEvidence: (evidenceId, patch) =>
        set((state) => ({
          evidence: state.evidence.map((e) =>
            e.id === evidenceId ? { ...e, ...patch } : e,
          ),
        })),

      addContradiction: (item) =>
        set((state) => ({ contradictions: [...state.contradictions, item] })),

      resolveContradiction: (contradictionId, resolution) =>
        set((state) => ({
          contradictions: state.contradictions.map((c) =>
            c.id === contradictionId
              ? { ...c, resolved: true, resolution }
              : c,
          ),
        })),

      addActionItem: (item) =>
        set((state) => ({ actionItems: [...state.actionItems, item] })),

      toggleActionItem: (actionItemId) =>
        set((state) => ({
          actionItems: state.actionItems.map((a) =>
            a.id === actionItemId ? { ...a, done: !a.done } : a,
          ),
        })),

      addPrediction: (prediction) =>
        set((state) => ({ predictions: [...state.predictions, prediction] })),

      recordActual: (predictionId, actualValue) => {
        const prediction = get().predictions.find((p) => p.id === predictionId);
        if (!prediction) return null;

        const ratio =
          actualValue === 0
            ? prediction.expectedValue === 0
              ? 1
              : Number.POSITIVE_INFINITY
            : prediction.expectedValue / actualValue;

        const hitRatio = Math.abs(ratio - 1);
        const status: Prediction["status"] =
          hitRatio <= 0.1 ? "hit" : hitRatio <= 0.35 ? "partial" : "missed";

        const updated: Prediction = {
          ...prediction,
          actualValue,
          ratio: Number.isFinite(ratio) ? ratio : 99,
          status,
          evaluatedAt: now(),
        };

        set((state) => ({
          predictions: state.predictions.map((p) =>
            p.id === predictionId ? updated : p,
          ),
        }));
        return updated;
      },

      addOutcome: (outcome) =>
        set((state) => ({
          outcomes: [
            ...state.outcomes.filter((o) => o.decisionId !== outcome.decisionId),
            outcome,
          ],
        })),

      setPatterns: (patterns) => set({ patterns }),

      addBoardMark: (mark) =>
        set((state) => ({
          boardMarks: [...(state.boardMarks ?? []), mark],
        })),

      addBoardMarks: (marks) =>
        set((state) => ({
          boardMarks: [...(state.boardMarks ?? []), ...marks],
        })),

      updateBoardMark: (markId, patch) =>
        set((state) => ({
          boardMarks: (state.boardMarks ?? []).map((mark) =>
            mark.id === markId ? { ...mark, ...patch } : mark,
          ),
        })),

      removeBoardMark: (markId) =>
        set((state) => ({
          boardMarks: (state.boardMarks ?? []).filter(
            (mark) => mark.id !== markId,
          ),
        })),

      adoptBoardMarks: (fromId, toId) =>
        set((state) => ({
          boardMarks: (state.boardMarks ?? []).map((mark) =>
            mark.decisionId === fromId ? { ...mark, decisionId: toId } : mark,
          ),
        })),

      addCanvasNode: (node) =>
        set((state) => ({
          canvasNodes: [...(state.canvasNodes ?? []), node],
        })),

      addCanvasNodes: (nodes) =>
        set((state) => ({
          canvasNodes: [...(state.canvasNodes ?? []), ...nodes],
        })),

      updateCanvasNode: (nodeId, patch) =>
        set((state) => ({
          canvasNodes: (state.canvasNodes ?? []).map((node) =>
            node.id === nodeId ? { ...node, ...patch } : node,
          ),
        })),

      removeCanvasNode: (nodeId) =>
        set((state) => ({
          canvasNodes: (state.canvasNodes ?? []).filter(
            (node) => node.id !== nodeId,
          ),
          canvasLinks: (state.canvasLinks ?? []).filter(
            (link) => link.fromId !== nodeId && link.toId !== nodeId,
          ),
        })),

      addCanvasLink: (link) =>
        set((state) => ({
          canvasLinks: [...(state.canvasLinks ?? []), link],
        })),

      addCanvasLinks: (links) =>
        set((state) => ({
          canvasLinks: [...(state.canvasLinks ?? []), ...links],
        })),

      removeCanvasLink: (linkId) =>
        set((state) => ({
          canvasLinks: (state.canvasLinks ?? []).filter(
            (link) => link.id !== linkId,
          ),
        })),

      adoptCanvas: (fromId, toId) =>
        set((state) => ({
          canvasNodes: (state.canvasNodes ?? []).map((node) =>
            node.decisionId === fromId ? { ...node, decisionId: toId } : node,
          ),
          canvasLinks: (state.canvasLinks ?? []).map((link) =>
            link.decisionId === fromId ? { ...link, decisionId: toId } : link,
          ),
        })),

      setHandoff: (handoff) => set({ handoff }),

      logToolCall: (call) =>
        set((state) => ({
          toolCalls: [
            { ...call, id: id("call"), at: now() },
            ...state.toolCalls,
          ].slice(0, 60),
        })),

      raisePatternAlert: (alert) =>
        set((state) => {
          const body = alert.body.trim();
          if (!body) return state;
          if (state.patternAlerts.some((item) => item.body === body)) {
            return state;
          }
          return {
            patternAlerts: [
              { ...alert, id: id("alert"), at: now() },
              ...state.patternAlerts,
            ].slice(0, 5),
          };
        }),

      dismissPatternAlert: (alertId) =>
        set((state) => ({
          patternAlerts: state.patternAlerts.filter((item) => item.id !== alertId),
        })),

      spotlight: (targetId) => set({ spotlightId: targetId }),

      proposeCommit: (proposal) => set({ pendingCommit: proposal }),

      markHydrated: () => set({ hydrated: true }),
}));
}

type ArenaStore = ReturnType<typeof createArenaStore>;
type ArenaGlobal = typeof globalThis & { __decisionArena?: ArenaStore };

function bindArenaStore(): ArenaStore {
  if (typeof window === "undefined") return createArenaStore();
  const root = globalThis as ArenaGlobal;
  const existing = root.__decisionArena;
  if (
    existing &&
    typeof existing.getState().addCanvasNode === "function" &&
    typeof existing.getState().upsertReassessment === "function" &&
    typeof existing.getState().beginNewArena === "function" &&
    typeof existing.getState().listingArenas === "boolean"
  ) {
    const state = existing.getState();
    const patch: Record<string, unknown> = {};
    if (!Array.isArray(state.boardMarks)) patch.boardMarks = [];
    if (!Array.isArray(state.canvasNodes)) patch.canvasNodes = [];
    if (!Array.isArray(state.canvasLinks)) patch.canvasLinks = [];
    if (Object.keys(patch).length) existing.setState(patch);
    return existing;
  }
  if (existing) {
    const snap = existing.getState();
    const created = createArenaStore();
    created.getState().importWorkspace({
      company: snap.company,
      decisions: snap.decisions,
      argumentList: snap.argumentList,
      defenses: snap.defenses,
      reassessments: snap.reassessments,
      risks: snap.risks,
      evidence: snap.evidence,
      contradictions: snap.contradictions,
      actionItems: snap.actionItems,
      predictions: snap.predictions,
      outcomes: snap.outcomes,
      patterns: snap.patterns,
      toolCalls: snap.toolCalls,
      boardMarks: snap.boardMarks ?? [],
      canvasNodes: snap.canvasNodes ?? [],
      canvasLinks: snap.canvasLinks ?? [],
      handoff: snap.handoff ?? null,
      activeDecisionId: snap.activeDecisionId,
      spotlightId: snap.spotlightId,
      pendingCommit: snap.pendingCommit,
    });
    root.__decisionArena = created;
    return created;
  }
  const created = createArenaStore();
  root.__decisionArena = created;
  return created;
}

export const useArena: ArenaStore = bindArenaStore();

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function makeActorMeta(createdBy: Actor, channel?: AgentChannel) {
  return { createdBy, channel, createdAt: now() };
}
