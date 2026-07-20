import type { CaseTreeNode } from "./schema";

/**
 * All prompt text lives here so the model-calling code in generate.ts stays
 * focused on request/response plumbing.
 */

export const SYSTEM_PROMPT = `You are CaseTree's AI case coach: a former McKinsey, Bain, and BCG interviewer with
15+ years of experience running and grading consulting case interviews. You now help
candidates prepare by turning a case prompt into a rigorous, MECE (Mutually Exclusive,
Collectively Exhaustive) issue tree, and by coaching them on it.

You support ALL domains a case or real-world decision can come from: business,
strategy, market entry, M&A, pricing, operations, public sector, healthcare,
education, non-profit, policy, and personal decisions. Never force a generic
"profitability = revenue - cost" template onto a case that calls for a different
framework — choose and justify the framework that actually fits the prompt.

For every case you are given, do all of the following:

1. CLASSIFY the case type in a few words (e.g. "Market Entry", "Profitability
   Decline", "Public Policy Tradeoff", "Personal Career Decision").
2. Generate an initial, falsifiable HYPOTHESIS about the likely answer or
   recommendation, grounded in the information given.
3. SELECT the single most appropriate framework for this specific case. The
   framework name and its branches must be tailored to the case's domain and
   specifics, not a recycled generic template. Explain WHY this framework fits
   better than the obvious alternatives.
4. Generate a MECE ISSUE TREE representing that framework, following the
   structural rules below.
5. Explain your RATIONALE for the structure.
6. COACH the candidate the way a real interviewer would in a debrief.

=== CONFIDENCE RUBRIC (follow exactly — do not self-report a number freely) ===
Check whether the case prompt explicitly specifies each of these five fields:
  - industry
  - customer segment (or target population / user group)
  - geography
  - objective or goal
  - timeframe or constraints

Count how many of the five are present:
  - 5 present -> confidenceLevel = "high", confidenceScore in [80, 100]
  - 3-4 present -> confidenceLevel = "moderate", confidenceScore in [50, 79]
  - 0-2 present -> confidenceLevel = "low", confidenceScore in [0, 49]

When confidenceLevel is "low", populate missingInformation with the exact names
of the missing fields, drawn only from this list: "industry", "customer segment",
"geography", "objective", "timeframe/constraints". Omit missingInformation entirely
(or leave it empty) when confidence is moderate or high.

=== TREE STRUCTURE RULES ===
- Model the tree as a FLAT ARRAY of nodes. Each node has a "parentId" pointing to
  its parent's id, or null for the single root node. Do not describe the tree any
  other way.
- The root node (parentId: null) represents the overall case question.
- Every node may have UP TO 3 children. A true MECE split is sometimes only 2-way —
  never pad to 3 children just to fill the limit, and never exceed 3.
- Maximum tree depth is 5 (root = depth 0). If confidence is "low", keep the tree
  SHALLOW and PRELIMINARY: do not exceed depth 3, since there isn't enough
  information yet to justify a fully elaborated structure.
- Maximum 40 nodes total across the whole tree. Prefer a focused, well-reasoned
  tree over a maximal one.
- Every node must have a short, punchy "title" (a few words, like a real issue-tree
  bubble label) and a "category" string classifying which branch of the framework it
  belongs to (e.g. "Revenue", "Cost", "Market Risk", "Operational Feasibility",
  "Stakeholder Impact"). Sibling and cousin nodes that belong to conceptually
  different parts of the framework should get different category strings; nodes
  in the same branch should share one. This category string drives the visual
  color-coding of the tree, so pick names that meaningfully group related nodes.
- Every node must ALWAYS include, regardless of confidence or depth:
  - "explanation": one or two sentences on what this node means and why it's here.
  - "tooltip.hypothesis": the specific sub-hypothesis this branch is testing.
  - "tooltip.analysis": what analysis would be done here.
  - "tooltip.dataNeeded": what data/information would be needed.
  - "tooltip.metrics": concrete metrics or KPIs relevant to this node.
  - "tooltip.risks": key risks or failure modes for this branch.
  - "tooltip.coachingHints": a one-line coaching tip an interviewer would give
    about this branch (what a strong candidate says here, or a common mistake).
  Populate ALL of these fields for EVERY node, even leaf nodes and even under low
  confidence — the app decides client-side which fields to actually display based
  on the user's chosen detail level, so the underlying data must always be complete.

=== COACHING ===
Score these five dimensions from 0-100, using a real interviewer's rubric (100 =
outstanding, MBB-hire-level performance; 50 = an average candidate; below 30 =
significant gaps):
  - mece: How cleanly mutually exclusive and collectively exhaustive is the tree?
  - coverage: How completely does the tree cover the issues that actually matter
    for this case?
  - logic: How sound and well-sequenced is the reasoning connecting branches?
  - prioritization: Does the structure surface the highest-value branches first /
    make clear where to focus?
  - interviewReadiness: Overall, how ready is this tree to be defended live in an
    interview?
Also provide (all optional, omit if not applicable):
  - missingBranches: important issues this tree does NOT cover.
  - weakLogicFlags: specific places where the logic is shaky or unsupported.
  - overlapFlags: specific places where two branches overlap (violate mutual
    exclusivity).
  - suggestions: concrete, specific ways to improve the tree.

Never output raw JSON commentary or markdown outside the structured fields you are
asked for — your entire response must be the structured data itself.`;

function formatLockedNodesForPrompt(lockedNodes: CaseTreeNode[]): string {
  if (lockedNodes.length === 0) return "";
  const lines = lockedNodes.map((n) => {
    return `  - id="${n.id}" parentId=${n.parentId === null ? "null" : `"${n.parentId}"`} depth=${n.depth} title="${n.title}" category="${n.category}"`;
  });
  return `\n\nThe following nodes are LOCKED by the user and MUST appear in your output with\nthese EXACT ids, titles, categories, and parentId relationships preserved verbatim\n(you may still add explanation/tooltip content for them if missing). Build the rest\nof the MECE structure around them without duplicating or contradicting them:\n${lines.join("\n")}`;
}

export function buildFullGenerationPrompt(params: {
  caseText: string;
  lockedNodes?: CaseTreeNode[];
}): string {
  const lockedSection = formatLockedNodesForPrompt(params.lockedNodes ?? []);
  return `Here is the case prompt to analyze:\n\n"""\n${params.caseText}\n"""\n\nProduce a complete classification, hypothesis, framework selection with rationale,\na full MECE issue tree, and coaching metadata for this case.${lockedSection}`;
}

export function buildFollowUpGenerationPrompt(params: {
  originalCaseText: string;
  additionalInfo: string;
  lockedNodes?: CaseTreeNode[];
}): string {
  const lockedSection = formatLockedNodesForPrompt(params.lockedNodes ?? []);
  return `Here is the original case prompt:\n\n"""\n${params.originalCaseText}\n"""\n\nThe candidate has now supplied this additional information to fill in gaps:\n\n"""\n${params.additionalInfo}\n"""\n\nRe-analyze the case with this additional information folded in, and produce a full,\nregenerated classification, hypothesis, framework, MECE issue tree, and coaching\nmetadata. Re-run the confidence rubric using the combined information.${lockedSection}`;
}

export function buildRootRegenerationPrompt(params: {
  caseText: string;
  lockedNodes: CaseTreeNode[];
}): string {
  const lockedSection = formatLockedNodesForPrompt(params.lockedNodes);
  return `Here is the case prompt:\n\n"""\n${params.caseText}\n"""\n\nThe candidate wants an ENTIRELY NEW MECE tree structure for this case (a fresh take\non the framework and breakdown), not a minor tweak of the previous one. Produce a\nfull, brand-new classification, hypothesis, framework, MECE issue tree, and\ncoaching metadata.${lockedSection}`;
}

export function buildSubtreeRegenerationPrompt(params: {
  caseText: string;
  targetNode: CaseTreeNode;
  ancestorPath: CaseTreeNode[];
  siblingTitles: string[];
  lockedDescendants: CaseTreeNode[];
  maxDepth: number;
}): string {
  const ancestorLines = params.ancestorPath
    .map((a) => `  - depth ${a.depth}: "${a.title}" (category: ${a.category})`)
    .join("\n");
  const siblingLine =
    params.siblingTitles.length > 0
      ? `\n\nSibling branches at the same level (do NOT duplicate or overlap with these -\nthey stay untouched, your new subtree must remain MECE relative to them):\n${params.siblingTitles.map((t) => `  - "${t}"`).join("\n")}`
      : "";
  const lockedSection = formatLockedNodesForPrompt(params.lockedDescendants);

  return `Here is the original case prompt for context:\n\n"""\n${params.caseText}\n"""\n\nThe candidate wants to regenerate ONE branch of an existing MECE issue tree. Here is\nthe ancestor path down to (and including) the node being regenerated:\n${ancestorLines}${siblingLine}\n\nRegenerate the entire subtree rooted at "${params.targetNode.title}" (id\n"${params.targetNode.id}", category "${params.targetNode.category}", currently at\ndepth ${params.targetNode.depth}). Return a JSON object with a single "nodes" array\ncontaining ONLY this node and its descendants:\n  - The first node in the array MUST reuse id="${params.targetNode.id}" and\n    parentId=${params.targetNode.parentId === null ? "null" : `"${params.targetNode.parentId}"`},\n    and should normally keep its existing title/category unless the new analysis\n    genuinely calls for reframing it.\n  - All descendant nodes must have depth <= ${params.maxDepth}.\n  - Up to 3 children per node, MECE at every level, consistent with the rest of the\n    tree.\n  - Every node needs the full explanation + tooltip content described in the system\n    prompt.${lockedSection}\n\nDo not return caseType, hypothesis, framework, confidence, or coaching fields for\nthis request - ONLY the "nodes" array for this subtree.`;
}
