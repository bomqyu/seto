import { create } from "zustand";
import type {
  CaseTreeNode,
  CaseTreeResponse,
  CoachingMetadata,
  ConfidenceLevel,
  DetailLevel,
} from "@/lib/ai/schema";
import { DETAIL_LEVEL_MAX_DEPTH } from "@/lib/ai/schema";
import {
  cloneNodes,
  countChildren,
  findNode,
  getAncestorPath,
  getDescendantNodes,
  getRoot,
  getSiblingTitles,
  recomputeDepths,
  removeSubtree,
} from "./ops";
import { reconcileLockedNodes } from "./reconcile";
import type { SavedTreeData } from "./types";

const MAX_HISTORY = 20;

const ALLOWED_LEVELS_LOW: DetailLevel[] = ["low"];
const ALLOWED_LEVELS_MODERATE: DetailLevel[] = ["low", "moderate"];
const ALLOWED_LEVELS_HIGH: DetailLevel[] = ["low", "moderate", "high"];

interface TreeSnapshot {
  nodes: CaseTreeNode[];
  originalSnapshotNodes: CaseTreeNode[];
  manualPositions: Record<string, { x: number; y: number }>;
  caseType: string;
  hypothesis: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  missingInformation: string[];
  framework: { name: string; reason: string };
  coaching: CoachingMetadata;
}

export type RequestStatus = "idle" | "loading" | "error";

interface TreeState {
  treeId: string | null;
  treeName: string;
  caseText: string;

  caseType: string;
  hypothesis: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  missingInformation: string[];
  framework: { name: string; reason: string };
  coaching: CoachingMetadata;

  nodes: CaseTreeNode[];
  originalSnapshotNodes: CaseTreeNode[];

  detailLevel: DetailLevel;
  collapsedIds: Set<string>;
  manualPositions: Record<string, { x: number; y: number }>;

  past: TreeSnapshot[];
  future: TreeSnapshot[];

  status: RequestStatus;
  error: string | null;
  regeneratingNodeId: string | null;

  hasTree: () => boolean;
  allowedDetailLevels: () => DetailLevel[];
  maxDepthForCurrentLevel: () => number;

  loadFromResponse: (response: CaseTreeResponse, opts: { caseText: string; treeId?: string; treeName?: string }) => void;
  loadSavedTree: (data: SavedTreeData) => void;
  generateFull: (caseText: string) => Promise<void>;
  reset: () => void;

  setDetailLevel: (level: DetailLevel) => void;
  toggleCollapse: (nodeId: string) => void;

  addNode: (parentId: string) => void;
  deleteNode: (nodeId: string) => void;
  editNode: (
    nodeId: string,
    updates: Partial<Pick<CaseTreeNode, "title" | "explanation" | "category" | "tooltip">>,
  ) => void;
  toggleLock: (nodeId: string) => void;
  beginDrag: () => void;
  setNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  regenerateRoot: () => Promise<void>;
  regenerateNode: (nodeId: string) => Promise<void>;
  submitFollowUp: (additionalInfo: string) => Promise<void>;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  getExportData: () => SavedTreeData | null;
  clearError: () => void;
}

function snapshotOf(state: TreeState): TreeSnapshot {
  return {
    nodes: cloneNodes(state.nodes),
    originalSnapshotNodes: cloneNodes(state.originalSnapshotNodes),
    manualPositions: { ...state.manualPositions },
    caseType: state.caseType,
    hypothesis: state.hypothesis,
    confidenceScore: state.confidenceScore,
    confidenceLevel: state.confidenceLevel,
    missingInformation: [...state.missingInformation],
    framework: { ...state.framework },
    coaching: JSON.parse(JSON.stringify(state.coaching)),
  };
}

function initialAiFields() {
  return {
    caseType: "",
    hypothesis: "",
    confidenceScore: 0,
    confidenceLevel: "low" as ConfidenceLevel,
    missingInformation: [] as string[],
    framework: { name: "", reason: "" },
    coaching: {
      scores: { mece: 0, coverage: 0, logic: 0, prioritization: 0, interviewReadiness: 0 },
    } as CoachingMetadata,
  };
}

export const useTreeStore = create<TreeState>((set, get) => ({
  treeId: null,
  treeName: "Untitled case",
  caseText: "",

  ...initialAiFields(),

  nodes: [],
  originalSnapshotNodes: [],

  detailLevel: "moderate",
  collapsedIds: new Set(),
  manualPositions: {},

  past: [],
  future: [],

  status: "idle",
  error: null,
  regeneratingNodeId: null,

  hasTree: () => get().nodes.length > 0,

  // Fixed array instances (not literals built on each call) so a selector like
  // `useTreeStore((s) => s.allowedDetailLevels())` returns a referentially
  // stable snapshot when confidenceLevel hasn't changed - required by
  // useSyncExternalStore (which zustand's hook is built on) to avoid
  // re-rendering (and looping) forever.
  allowedDetailLevels: () => {
    const level = get().confidenceLevel;
    if (level === "low") return ALLOWED_LEVELS_LOW;
    if (level === "moderate") return ALLOWED_LEVELS_MODERATE;
    return ALLOWED_LEVELS_HIGH;
  },

  maxDepthForCurrentLevel: () => DETAIL_LEVEL_MAX_DEPTH[get().detailLevel],

  loadFromResponse: (response, opts) => {
    const nodes = recomputeDepths(response.nodes);
    set({
      treeId: opts.treeId ?? crypto.randomUUID(),
      treeName: opts.treeName ?? response.caseType,
      caseText: opts.caseText,
      caseType: response.caseType,
      hypothesis: response.hypothesis,
      confidenceScore: response.confidenceScore,
      confidenceLevel: response.confidenceLevel,
      missingInformation: response.missingInformation ?? [],
      framework: response.framework,
      coaching: response.coaching,
      nodes,
      originalSnapshotNodes: cloneNodes(nodes),
      detailLevel: response.confidenceLevel === "low" ? "low" : "moderate",
      collapsedIds: new Set(),
      manualPositions: {},
      past: [],
      future: [],
      status: "idle",
      error: null,
      regeneratingNodeId: null,
    });
  },

  loadSavedTree: (data) => {
    set({
      treeId: data.id,
      treeName: data.name,
      caseText: data.caseText,
      caseType: data.caseType,
      hypothesis: data.hypothesis,
      confidenceScore: data.confidenceScore,
      confidenceLevel: data.confidenceLevel,
      missingInformation: data.missingInformation,
      framework: data.framework,
      coaching: data.coaching,
      nodes: cloneNodes(data.nodes),
      originalSnapshotNodes: cloneNodes(data.originalSnapshotNodes),
      manualPositions: { ...data.manualPositions },
      detailLevel: data.detailLevel,
      collapsedIds: new Set(),
      past: [],
      future: [],
      status: "idle",
      error: null,
      regeneratingNodeId: null,
    });
  },

  generateFull: async (caseText) => {
    set({ status: "loading", error: null });
    try {
      const res = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full", caseText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate the tree.");
      get().loadFromResponse(json as CaseTreeResponse, { caseText });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to generate the tree.",
      });
    }
  },

  reset: () => {
    set({
      treeId: null,
      treeName: "Untitled case",
      caseText: "",
      ...initialAiFields(),
      nodes: [],
      originalSnapshotNodes: [],
      detailLevel: "moderate",
      collapsedIds: new Set(),
      manualPositions: {},
      past: [],
      future: [],
      status: "idle",
      error: null,
      regeneratingNodeId: null,
    });
  },

  setDetailLevel: (level) => {
    if (!get().allowedDetailLevels().includes(level)) return;
    set({ detailLevel: level });
  },

  toggleCollapse: (nodeId) => {
    set((state) => {
      const next = new Set(state.collapsedIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { collapsedIds: next };
    });
  },

  addNode: (parentId) => {
    const state = get();
    const parent = findNode(state.nodes, parentId);
    if (!parent) return;
    if (countChildren(state.nodes, parentId) >= 3) {
      set({ error: "A node can have at most 3 children to stay MECE." });
      return;
    }

    const snapshot = snapshotOf(state);
    const newNode: CaseTreeNode = {
      id: crypto.randomUUID(),
      parentId,
      title: "New issue",
      category: parent.category,
      depth: parent.depth + 1,
      explanation: "",
      tooltip: {},
    };

    set({
      nodes: recomputeDepths([...state.nodes, newNode]),
      past: [...state.past, snapshot].slice(-MAX_HISTORY),
      future: [],
      error: null,
    });
  },

  deleteNode: (nodeId) => {
    const state = get();
    const node = findNode(state.nodes, nodeId);
    if (!node) return;
    if (node.parentId === null) {
      set({ error: "The root node can't be deleted." });
      return;
    }
    if (node.locked) {
      set({ error: "This node is locked and can't be deleted." });
      return;
    }

    const snapshot = snapshotOf(state);
    set({
      nodes: removeSubtree(state.nodes, nodeId),
      past: [...state.past, snapshot].slice(-MAX_HISTORY),
      future: [],
      error: null,
    });
  },

  editNode: (nodeId, updates) => {
    const state = get();
    const node = findNode(state.nodes, nodeId);
    if (!node) return;
    if (node.locked) {
      set({ error: "This node is locked and can't be edited." });
      return;
    }

    const snapshot = snapshotOf(state);
    set({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              ...updates,
              tooltip: updates.tooltip ? { ...n.tooltip, ...updates.tooltip } : n.tooltip,
            }
          : n,
      ),
      past: [...state.past, snapshot].slice(-MAX_HISTORY),
      future: [],
      error: null,
    });
  },

  toggleLock: (nodeId) => {
    const state = get();
    const node = findNode(state.nodes, nodeId);
    if (!node) return;

    const snapshot = snapshotOf(state);
    set({
      nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, locked: !n.locked } : n)),
      past: [...state.past, snapshot].slice(-MAX_HISTORY),
      future: [],
    });
  },

  beginDrag: () => {
    const state = get();
    const snapshot = snapshotOf(state);
    set({ past: [...state.past, snapshot].slice(-MAX_HISTORY), future: [] });
  },

  setNodePosition: (nodeId, position) => {
    set((state) => ({
      manualPositions: { ...state.manualPositions, [nodeId]: position },
    }));
  },

  regenerateRoot: async () => {
    const state = get();
    if (!state.hasTree()) return;
    const lockedNodes = state.nodes.filter((n) => n.locked);

    set({ status: "loading", error: null, regeneratingNodeId: null });
    try {
      const res = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "regenerate-root",
          caseText: state.caseText,
          lockedNodes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to regenerate the tree.");

      const response = json as CaseTreeResponse;
      const reconciled = recomputeDepths(
        reconcileLockedNodes({ aiNodes: response.nodes, lockedNodes }),
      );

      const snapshot = snapshotOf(get());
      set({
        caseType: response.caseType,
        hypothesis: response.hypothesis,
        confidenceScore: response.confidenceScore,
        confidenceLevel: response.confidenceLevel,
        missingInformation: response.missingInformation ?? [],
        framework: response.framework,
        coaching: response.coaching,
        nodes: reconciled,
        manualPositions: {},
        past: [...get().past, snapshot].slice(-MAX_HISTORY),
        future: [],
        status: "idle",
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to regenerate the tree.",
      });
    }
  },

  regenerateNode: async (nodeId) => {
    const state = get();
    const target = findNode(state.nodes, nodeId);
    if (!target) return;
    if (target.locked) {
      set({ error: "This node is locked and can't be regenerated." });
      return;
    }
    if (target.parentId === null) {
      await get().regenerateRoot();
      return;
    }

    const ancestorPath = getAncestorPath(state.nodes, nodeId);
    const siblingTitles = getSiblingTitles(state.nodes, nodeId);
    const lockedDescendants = getDescendantNodes(state.nodes, nodeId).filter((n) => n.locked);
    const maxDepth = DETAIL_LEVEL_MAX_DEPTH.high;

    set({ status: "loading", error: null, regeneratingNodeId: nodeId });
    try {
      const res = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "regenerate-subtree",
          caseText: state.caseText,
          targetNode: target,
          ancestorPath,
          siblingTitles,
          lockedDescendants,
          maxDepth,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to regenerate this branch.");

      const subtreeNodes = (json.nodes as CaseTreeNode[]) ?? [];
      const reconciledSubtree = reconcileLockedNodes({
        aiNodes: subtreeNodes,
        lockedNodes: lockedDescendants,
      });

      const current = get();
      const remainingNodes = removeSubtree(current.nodes, nodeId);
      const merged = recomputeDepths([...remainingNodes, ...reconciledSubtree]);

      const snapshot = snapshotOf(current);
      set({
        nodes: merged,
        past: [...current.past, snapshot].slice(-MAX_HISTORY),
        future: [],
        status: "idle",
        regeneratingNodeId: null,
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to regenerate this branch.",
        regeneratingNodeId: null,
      });
    }
  },

  submitFollowUp: async (additionalInfo) => {
    const state = get();
    const lockedNodes = state.nodes.filter((n) => n.locked);

    set({ status: "loading", error: null });
    try {
      const res = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "followup",
          originalCaseText: state.caseText,
          additionalInfo,
          lockedNodes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to regenerate the tree.");

      const response = json as CaseTreeResponse;
      const reconciled = recomputeDepths(
        reconcileLockedNodes({ aiNodes: response.nodes, lockedNodes }),
      );
      const combinedCaseText = `${state.caseText}\n\nAdditional details provided:\n${additionalInfo}`;

      set({
        caseText: combinedCaseText,
        caseType: response.caseType,
        hypothesis: response.hypothesis,
        confidenceScore: response.confidenceScore,
        confidenceLevel: response.confidenceLevel,
        missingInformation: response.missingInformation ?? [],
        framework: response.framework,
        coaching: response.coaching,
        nodes: reconciled,
        originalSnapshotNodes: cloneNodes(reconciled),
        detailLevel: response.confidenceLevel === "low" ? "low" : "moderate",
        manualPositions: {},
        past: [],
        future: [],
        status: "idle",
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to regenerate the tree.",
      });
    }
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const previous = state.past[state.past.length - 1];
    const currentSnapshot = snapshotOf(state);
    set({
      ...previous,
      past: state.past.slice(0, -1),
      future: [currentSnapshot, ...state.future].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const next = state.future[0];
    const currentSnapshot = snapshotOf(state);
    set({
      ...next,
      past: [...state.past, currentSnapshot].slice(-MAX_HISTORY),
      future: state.future.slice(1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  getExportData: () => {
    const state = get();
    if (!state.hasTree() || !state.treeId) return null;
    const now = Date.now();
    const data: SavedTreeData = {
      id: state.treeId,
      name: state.treeName,
      caseText: state.caseText,
      createdAt: now,
      updatedAt: now,
      caseType: state.caseType,
      hypothesis: state.hypothesis,
      confidenceScore: state.confidenceScore,
      confidenceLevel: state.confidenceLevel,
      missingInformation: state.missingInformation,
      framework: state.framework,
      coaching: state.coaching,
      nodes: cloneNodes(state.nodes),
      originalSnapshotNodes: cloneNodes(state.originalSnapshotNodes),
      manualPositions: { ...state.manualPositions },
      detailLevel: state.detailLevel,
    };
    return data;
  },

  clearError: () => set({ error: null }),
}));

export function selectRootNode(state: TreeState): CaseTreeNode | undefined {
  return getRoot(state.nodes);
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  // Dev-only escape hatch for manual/e2e testing without hitting the real API.
  (window as unknown as { __CASETREE_STORE__?: typeof useTreeStore }).__CASETREE_STORE__ =
    useTreeStore;
}
