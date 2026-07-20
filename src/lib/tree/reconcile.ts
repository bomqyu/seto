import type { CaseTreeNode } from "@/lib/ai/schema";

/**
 * After a branch or root regeneration, force every previously-locked node
 * back to its exact original content/id/parent so it is "preserved
 * unchanged" per the spec, regardless of what the AI returned for it. Any
 * locked node the AI dropped entirely is re-inserted under its original
 * parent.
 */
export function reconcileLockedNodes(params: {
  aiNodes: CaseTreeNode[];
  lockedNodes: CaseTreeNode[];
}): CaseTreeNode[] {
  const { aiNodes, lockedNodes } = params;
  const lockedById = new Map(lockedNodes.map((n) => [n.id, n]));
  const aiIds = new Set(aiNodes.map((n) => n.id));

  const result: CaseTreeNode[] = aiNodes.map((node) => {
    const original = lockedById.get(node.id);
    if (!original) return node;

    // Keep the AI's placement if it points at a node that actually exists in
    // the new output (locked or freshly generated); otherwise fall back to
    // where the locked node originally lived.
    const parentStillExists = node.parentId === null || aiIds.has(node.parentId);
    return {
      ...original,
      parentId: parentStillExists ? node.parentId : original.parentId,
    };
  });

  const resultIds = new Set(result.map((n) => n.id));
  for (const locked of lockedNodes) {
    if (!resultIds.has(locked.id)) {
      result.push({ ...locked });
      resultIds.add(locked.id);
    }
  }

  // A re-inserted locked node keeps its original parentId, which may no
  // longer exist (e.g. a root regeneration wipes out every unlocked
  // ancestor). Reattach any node whose parent didn't survive to the new
  // tree's root so it stays part of the visible structure instead of
  // silently becoming an orphan that never renders.
  const newRoot = result.find((n) => n.parentId === null);
  if (newRoot) {
    for (const node of result) {
      if (node.id === newRoot.id) continue;
      if (node.parentId === null || !resultIds.has(node.parentId)) {
        node.parentId = newRoot.id;
      }
    }
  }

  return result;
}
