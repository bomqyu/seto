import { CASETREE_EXPORT_FORMAT, type CaseTreeExportFile, type SavedTreeData } from "@/lib/tree/types";

/**
 * Browser localStorage persistence for saved trees. This is the only
 * persistence layer in v1 - swapping it for a database later just means
 * reimplementing this module's functions against an API instead of
 * localStorage; nothing else in the app should touch `localStorage`
 * directly.
 */

const STORAGE_KEY = "casetree.savedTrees.v1";

export interface SavedTreeSummary {
  id: string;
  name: string;
  caseType: string;
  confidenceLevel: SavedTreeData["confidenceLevel"];
  nodeCount: number;
  createdAt: number;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): SavedTreeData[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedTreeData[]) : [];
  } catch {
    return [];
  }
}

function writeAll(trees: SavedTreeData[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
}

export function listSavedTrees(): SavedTreeSummary[] {
  return readAll()
    .map((t) => ({
      id: t.id,
      name: t.name,
      caseType: t.caseType,
      confidenceLevel: t.confidenceLevel,
      nodeCount: t.nodes.length,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSavedTree(id: string): SavedTreeData | undefined {
  return readAll().find((t) => t.id === id);
}

/** Insert or update a tree by id. */
export function upsertSavedTree(tree: SavedTreeData): void {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === tree.id);
  const withTimestamp: SavedTreeData = { ...tree, updatedAt: Date.now() };
  if (idx === -1) {
    all.push(withTimestamp);
  } else {
    all[idx] = withTimestamp;
  }
  writeAll(all);
}

export function deleteSavedTree(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function renameSavedTree(id: string, name: string): void {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], name, updatedAt: Date.now() };
  writeAll(all);
}

/**
 * Duplicates a tree as a brand-new, independent entry in the saved list -
 * the whole tree, not a single branch.
 */
export function duplicateSavedTree(id: string): SavedTreeData | undefined {
  const source = getSavedTree(id);
  if (!source) return undefined;
  const now = Date.now();
  const copy: SavedTreeData = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...readAll(), copy]);
  return copy;
}

export function buildExportFile(tree: SavedTreeData): CaseTreeExportFile {
  return {
    format: CASETREE_EXPORT_FORMAT,
    exportedAt: Date.now(),
    tree,
  };
}

export function downloadTreeAsJson(tree: SavedTreeData): void {
  const file = buildExportFile(tree);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = tree.name.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-") || "casetree";
  link.download = `${safeName}.casetree.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export class TreeImportError extends Error {}

/** Parses and lightly validates an imported JSON file, assigning a fresh id. */
export function parseImportedTreeFile(raw: string): SavedTreeData {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new TreeImportError("This file isn't valid JSON.");
  }

  const candidate =
    typeof json === "object" && json !== null && "tree" in (json as Record<string, unknown>)
      ? (json as CaseTreeExportFile).tree
      : (json as SavedTreeData);

  if (
    !candidate ||
    typeof candidate !== "object" ||
    !Array.isArray(candidate.nodes) ||
    typeof candidate.caseText !== "string"
  ) {
    throw new TreeImportError("This doesn't look like a CaseTree export file.");
  }

  const now = Date.now();
  return {
    ...candidate,
    id: crypto.randomUUID(),
    createdAt: candidate.createdAt ?? now,
    updatedAt: now,
  };
}

export function importTreeFromFile(raw: string): SavedTreeData {
  const tree = parseImportedTreeFile(raw);
  upsertSavedTree(tree);
  return tree;
}
