import { z } from "zod";

/**
 * Schema for the AI's structured response. Kept in its own module so the
 * AI-calling layer and the tree-state layer can both depend on it without
 * depending on each other.
 */

export const DetailLevelSchema = z.enum(["low", "moderate", "high"]);
export type DetailLevel = z.infer<typeof DetailLevelSchema>;

export const ConfidenceLevelSchema = z.enum(["low", "moderate", "high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const MISSING_INFO_FIELDS = [
  "industry",
  "customer segment",
  "geography",
  "objective",
  "timeframe/constraints",
] as const;
export type MissingInfoField = (typeof MISSING_INFO_FIELDS)[number];

export const CaseTreeNodeTooltipSchema = z.object({
  hypothesis: z.string().optional(),
  analysis: z.string().optional(),
  dataNeeded: z.string().optional(),
  metrics: z.string().optional(),
  risks: z.string().optional(),
  coachingHints: z.string().optional(),
});
export type CaseTreeNodeTooltip = z.infer<typeof CaseTreeNodeTooltipSchema>;

export const CaseTreeNodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  title: z.string().min(1),
  category: z.string().min(1),
  depth: z.number().int().min(0),
  explanation: z.string().optional(),
  tooltip: CaseTreeNodeTooltipSchema.optional(),
  locked: z.boolean().optional(),
});
export type CaseTreeNode = z.infer<typeof CaseTreeNodeSchema>;

export const CoachingMetadataSchema = z.object({
  scores: z.object({
    mece: z.number().min(0).max(100),
    coverage: z.number().min(0).max(100),
    logic: z.number().min(0).max(100),
    prioritization: z.number().min(0).max(100),
    interviewReadiness: z.number().min(0).max(100),
  }),
  missingBranches: z.array(z.string()).optional(),
  weakLogicFlags: z.array(z.string()).optional(),
  overlapFlags: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});
export type CoachingMetadata = z.infer<typeof CoachingMetadataSchema>;

export const CaseTreeResponseSchema = z
  .object({
    caseType: z.string().min(1),
    hypothesis: z.string().min(1),
    confidenceScore: z.number().int().min(0).max(100),
    confidenceLevel: ConfidenceLevelSchema,
    missingInformation: z.array(z.string()).optional(),
    framework: z.object({
      name: z.string().min(1),
      reason: z.string().min(1),
    }),
    nodes: z.array(CaseTreeNodeSchema).min(1).max(40),
    coaching: CoachingMetadataSchema,
  })
  .superRefine((val, ctx) => {
    const ids = new Set<string>();
    for (const node of val.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes"],
        });
      }
      ids.add(node.id);
    }

    const roots = val.nodes.filter((n) => n.parentId === null);
    if (roots.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `Expected exactly 1 root node (parentId: null), found ${roots.length}`,
        path: ["nodes"],
      });
    }

    for (const node of val.nodes) {
      if (node.parentId !== null && !ids.has(node.parentId)) {
        ctx.addIssue({
          code: "custom",
          message: `Node ${node.id} references missing parentId ${node.parentId}`,
          path: ["nodes"],
        });
      }
    }

    const childCounts = new Map<string, number>();
    for (const node of val.nodes) {
      if (node.parentId === null) continue;
      childCounts.set(node.parentId, (childCounts.get(node.parentId) ?? 0) + 1);
    }
    for (const [parentId, count] of childCounts) {
      if (count > 3) {
        ctx.addIssue({
          code: "custom",
          message: `Node ${parentId} has ${count} children, max allowed is 3`,
          path: ["nodes"],
        });
      }
    }
  });

export type CaseTreeResponse = z.infer<typeof CaseTreeResponseSchema>;

/** Response shape for a single-branch regeneration (subtree, not the whole tree). */
export const SubtreeResponseSchema = z.object({
  nodes: z.array(CaseTreeNodeSchema).min(1).max(40),
});
export type SubtreeResponse = z.infer<typeof SubtreeResponseSchema>;

export const MAX_NODES = 40;
export const MAX_CHILDREN_PER_NODE = 3;

export const DETAIL_LEVEL_MAX_DEPTH: Record<DetailLevel, number> = {
  low: 3,
  moderate: 4,
  high: 5,
};

export function deriveConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return "high";
  if (score >= 50) return "moderate";
  return "low";
}
