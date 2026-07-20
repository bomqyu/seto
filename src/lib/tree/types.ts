import type {
  CaseTreeNode,
  CoachingMetadata,
  ConfidenceLevel,
  DetailLevel,
} from "@/lib/ai/schema";

/**
 * The full, serializable shape of a tree - used for localStorage persistence,
 * JSON export/import, and duplication. Shared between the zustand store and
 * the storage module so neither has to import the other.
 */
export interface SavedTreeData {
  id: string;
  name: string;
  caseText: string;
  createdAt: number;
  updatedAt: number;

  caseType: string;
  hypothesis: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  missingInformation: string[];
  framework: { name: string; reason: string };
  coaching: CoachingMetadata;

  nodes: CaseTreeNode[];
  originalSnapshotNodes: CaseTreeNode[];
  manualPositions: Record<string, { x: number; y: number }>;
  detailLevel: DetailLevel;
}

export const CASETREE_EXPORT_FORMAT = "casetree.v1" as const;

export interface CaseTreeExportFile {
  format: typeof CASETREE_EXPORT_FORMAT;
  exportedAt: number;
  tree: SavedTreeData;
}
