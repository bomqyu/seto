import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type { CaseTreeNode } from "@/lib/ai/schema";
import type { DetailLevel } from "@/lib/ai/schema";

export const NODE_WIDTH = 260;

export function estimateNodeHeight(node: CaseTreeNode, detailLevel: DetailLevel): number {
  if (detailLevel === "low") return 56;
  // moderate/high show title + explanation; height grows a little with text length
  const explanationLength = node.explanation?.length ?? 0;
  const extra = explanationLength > 90 ? 24 : 0;
  return 104 + extra;
}

export interface CaseFlowNodeData extends Record<string, unknown> {
  caseNode: CaseTreeNode;
  detailLevel: DetailLevel;
  hasChildren: boolean;
  childCount: number;
  isCollapsed: boolean;
  isRoot: boolean;
}

export type CaseFlowNode = Node<CaseFlowNodeData, "caseNode">;

interface BuildFlowGraphParams {
  allNodes: CaseTreeNode[];
  detailLevel: DetailLevel;
  maxDepth: number;
  collapsedIds: ReadonlySet<string>;
  manualPositions: Readonly<Record<string, { x: number; y: number }>>;
}

/**
 * Determines the visible node set (respecting the detail level's max depth and
 * any manually collapsed branches), lays it out with dagre, and returns
 * ready-to-render React Flow nodes/edges. A manual drag position (stored in
 * manualPositions) overrides the computed position for that node until the
 * next full regeneration clears it.
 */
export function buildFlowGraph({
  allNodes,
  detailLevel,
  maxDepth,
  collapsedIds,
  manualPositions,
}: BuildFlowGraphParams): { nodes: CaseFlowNode[]; edges: Edge[] } {
  const childrenOf = new Map<string, CaseTreeNode[]>();
  for (const node of allNodes) {
    if (node.parentId === null) continue;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  }

  const root = allNodes.find((n) => n.parentId === null);
  const visible: CaseTreeNode[] = [];

  if (root) {
    const stack: CaseTreeNode[] = [root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.depth > maxDepth) continue;
      visible.push(node);
      if (collapsedIds.has(node.id)) continue;
      const children = childrenOf.get(node.id) ?? [];
      for (const child of children) stack.push(child);
    }
  }

  const visibleIds = new Set(visible.map((n) => n.id));

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 56, ranksep: 90, marginx: 40, marginy: 40 });

  for (const node of visible) {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateNodeHeight(node, detailLevel),
    });
  }
  for (const node of visible) {
    if (node.parentId && visibleIds.has(node.parentId)) {
      graph.setEdge(node.parentId, node.id);
    }
  }

  dagre.layout(graph);

  const flowNodes: CaseFlowNode[] = visible.map((node) => {
    const manual = manualPositions[node.id];
    const height = estimateNodeHeight(node, detailLevel);
    let position: { x: number; y: number };
    if (manual) {
      position = manual;
    } else {
      const computed = graph.node(node.id);
      position = { x: computed.x - NODE_WIDTH / 2, y: computed.y - height / 2 };
    }

    const childCount = childrenOf.get(node.id)?.length ?? 0;

    return {
      id: node.id,
      type: "caseNode",
      position,
      data: {
        caseNode: node,
        detailLevel,
        hasChildren: childCount > 0,
        childCount,
        isCollapsed: collapsedIds.has(node.id),
        isRoot: node.parentId === null,
      },
      draggable: true,
    };
  });

  const flowEdges: Edge[] = visible
    .filter((n) => n.parentId && visibleIds.has(n.parentId))
    .map((n) => ({
      id: `${n.parentId}->${n.id}`,
      source: n.parentId as string,
      target: n.id,
      type: "smoothstep",
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

export function getVisibleDescendantCount(
  allNodes: CaseTreeNode[],
  nodeId: string,
): number {
  const childrenOf = new Map<string, CaseTreeNode[]>();
  for (const node of allNodes) {
    if (node.parentId === null) continue;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  }
  let count = 0;
  const stack = [...(childrenOf.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop()!;
    count++;
    stack.push(...(childrenOf.get(node.id) ?? []));
  }
  return count;
}
