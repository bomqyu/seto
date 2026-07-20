"use client";

import { useState } from "react";
import {
  deleteSavedTree,
  duplicateSavedTree,
  getSavedTree,
  listSavedTrees,
  renameSavedTree,
  type SavedTreeSummary,
} from "@/lib/storage/savedTrees";
import { useTreeStore } from "@/lib/tree/store";
import { CopyIcon, TrashIcon } from "./icons";

export default function SavedTreesSidebar({
  onClose,
  onOpenTree,
}: {
  onClose: () => void;
  onOpenTree: () => void;
}) {
  const [trees, setTrees] = useState<SavedTreeSummary[]>(() => listSavedTrees());
  const currentTreeId = useTreeStore((s) => s.treeId);
  const loadSavedTree = useTreeStore((s) => s.loadSavedTree);

  function refresh() {
    setTrees(listSavedTrees());
  }

  function handleOpen(id: string) {
    const tree = getSavedTree(id);
    if (!tree) return;
    loadSavedTree(tree);
    onOpenTree();
  }

  function handleDelete(id: string) {
    deleteSavedTree(id);
    refresh();
  }

  function handleDuplicate(id: string) {
    duplicateSavedTree(id);
    refresh();
  }

  function handleRename(id: string, name: string) {
    renameSavedTree(id, name);
    refresh();
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-900/80">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Saved trees</h2>
        <button
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {trees.length === 0 && (
          <p className="p-3 text-xs text-neutral-500 dark:text-neutral-400">
            No saved trees yet. Generate a tree and click Save in the toolbar.
          </p>
        )}
        <ul className="space-y-1">
          {trees.map((tree) => (
            <li
              key={tree.id}
              className={`group rounded-lg border px-3 py-2 text-sm ${
                tree.id === currentTreeId
                  ? "border-neutral-400 bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800"
                  : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <button className="block w-full text-left" onClick={() => handleOpen(tree.id)}>
                <input
                  className="w-full truncate bg-transparent font-medium text-neutral-900 outline-none focus:underline dark:text-neutral-50"
                  defaultValue={tree.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => handleRename(tree.id, e.target.value)}
                />
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {tree.caseType || "Untitled"} · {tree.nodeCount} nodes · {tree.confidenceLevel}
                </p>
              </button>
              <div className="mt-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                <button
                  title="Duplicate"
                  className="rounded p-1 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={() => handleDuplicate(tree.id)}
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Delete"
                  className="rounded p-1 text-neutral-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10"
                  onClick={() => handleDelete(tree.id)}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
