import type { CaseTreeNode } from "@/lib/ai/schema";

export interface CoverageDiff {
  coverageScore: number;
  missingBranches: string[];
}

/**
 * Coverage is computed by diffing the current (possibly edited) tree against
 * the snapshot taken right after the original AI generation - no second AI
 * call needed. A node counts as "covered" if it still exists (by id) and its
 * category wasn't changed; otherwise it's reported as missing or altered.
 * Only the highest missing ancestor in a removed branch is reported, so
 * deleting one big branch doesn't flood the list with every child.
 */
export function computeCoverageDiff(
  original: CaseTreeNode[],
  current: CaseTreeNode[],
): CoverageDiff {
  if (original.length === 0) {
    return { coverageScore: 100, missingBranches: [] };
  }

  const currentById = new Map(current.map((n) => [n.id, n]));
  const orderedByDepth = [...original].sort((a, b) => a.depth - b.depth);

  let coveredCount = 0;
  const missingBranches: string[] = [];
  const uncoveredIds = new Set<string>();

  for (const node of orderedByDepth) {
    const currentNode = currentById.get(node.id);
    const covered = !!currentNode && currentNode.category === node.category;

    if (covered) {
      coveredCount++;
      continue;
    }

    uncoveredIds.add(node.id);
    if (node.parentId && uncoveredIds.has(node.parentId)) {
      // Already reported via an ancestor - don't repeat every descendant.
      continue;
    }

    missingBranches.push(currentNode ? `${node.title} (altered)` : node.title);
  }

  const coverageScore = Math.round((coveredCount / original.length) * 100);
  return { coverageScore, missingBranches };
}
