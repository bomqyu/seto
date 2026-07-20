import type { CaseTreeNode } from "@/lib/ai/schema";

/** Pure helpers for working with the flat, parentId-based node array. */

export function cloneNodes(nodes: CaseTreeNode[]): CaseTreeNode[] {
  return nodes.map((n) => ({
    ...n,
    tooltip: n.tooltip ? { ...n.tooltip } : undefined,
  }));
}

export function findNode(nodes: CaseTreeNode[], id: string): CaseTreeNode | undefined {
  return nodes.find((n) => n.id === id);
}

export function getRoot(nodes: CaseTreeNode[]): CaseTreeNode | undefined {
  return nodes.find((n) => n.parentId === null);
}

export function getChildren(nodes: CaseTreeNode[], parentId: string): CaseTreeNode[] {
  return nodes.filter((n) => n.parentId === parentId);
}

export function countChildren(nodes: CaseTreeNode[], parentId: string): number {
  return getChildren(nodes, parentId).length;
}

/** Every descendant of `id`, not including `id` itself. */
export function getDescendantNodes(nodes: CaseTreeNode[], id: string): CaseTreeNode[] {
  const byParent = new Map<string, CaseTreeNode[]>();
  for (const n of nodes) {
    if (n.parentId === null) continue;
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  const result: CaseTreeNode[] = [];
  const stack = [...(byParent.get(id) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    stack.push(...(byParent.get(node.id) ?? []));
  }
  return result;
}

/** Path from the root down to and including `id`. */
export function getAncestorPath(nodes: CaseTreeNode[], id: string): CaseTreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: CaseTreeNode[] = [];
  let current = byId.get(id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function getSiblingTitles(nodes: CaseTreeNode[], id: string): string[] {
  const node = findNode(nodes, id);
  if (!node || node.parentId === null) return [];
  return getChildren(nodes, node.parentId)
    .filter((n) => n.id !== id)
    .map((n) => n.title);
}

/** Removes `id` and all of its descendants. */
export function removeSubtree(nodes: CaseTreeNode[], id: string): CaseTreeNode[] {
  const toRemove = new Set([id, ...getDescendantNodes(nodes, id).map((n) => n.id)]);
  return nodes.filter((n) => !toRemove.has(n.id));
}

/** Recomputes `depth` for every node from the root down, following parentId. */
export function recomputeDepths(nodes: CaseTreeNode[]): CaseTreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, { ...n }]));
  const byParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentId === null) continue;
    const list = byParent.get(n.parentId) ?? [];
    list.push(n.id);
    byParent.set(n.parentId, list);
  }

  const root = nodes.find((n) => n.parentId === null);
  if (!root) return Array.from(byId.values());

  const rootCopy = byId.get(root.id)!;
  rootCopy.depth = 0;
  const stack: string[] = [root.id];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const parentDepth = byId.get(id)!.depth;
    for (const childId of byParent.get(id) ?? []) {
      const child = byId.get(childId);
      if (!child) continue;
      child.depth = parentDepth + 1;
      stack.push(childId);
    }
  }

  return Array.from(byId.values());
}

export function isDescendantOf(nodes: CaseTreeNode[], candidateId: string, ancestorId: string): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(candidateId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}
