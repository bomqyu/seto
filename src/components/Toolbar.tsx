"use client";

import { useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTreeStore } from "@/lib/tree/store";
import { useTheme } from "@/lib/theme/ThemeContext";
import {
  downloadTreeAsJson,
  importTreeFromFile,
  upsertSavedTree,
  duplicateSavedTree,
  TreeImportError,
} from "@/lib/storage/savedTrees";
import { exportFlowAsPng } from "@/lib/export/png";
import type { DetailLevel } from "@/lib/ai/schema";
import {
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  MoonIcon,
  RedoIcon,
  RefreshIcon,
  SunIcon,
  UndoIcon,
  UploadIcon,
} from "./icons";

const LEVELS: { value: DetailLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export default function Toolbar({
  onNewCase,
  onTreeLoaded,
  onToggleSidebar,
}: {
  onNewCase: () => void;
  onTreeLoaded: () => void;
  onToggleSidebar: () => void;
}) {
  const detailLevel = useTreeStore((s) => s.detailLevel);
  const allowedLevels = useTreeStore((s) => s.allowedDetailLevels());
  const setDetailLevel = useTreeStore((s) => s.setDetailLevel);
  const undo = useTreeStore((s) => s.undo);
  const redo = useTreeStore((s) => s.redo);
  const canUndo = useTreeStore((s) => s.canUndo());
  const canRedo = useTreeStore((s) => s.canRedo());
  const regenerateRoot = useTreeStore((s) => s.regenerateRoot);
  const status = useTreeStore((s) => s.status);
  const getExportData = useTreeStore((s) => s.getExportData);
  const treeName = useTreeStore((s) => s.treeName);
  const loadSavedTree = useTreeStore((s) => s.loadSavedTree);

  const { theme, toggle } = useTheme();
  const reactFlow = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isBusy = status === "loading";

  function handleSave() {
    const data = getExportData();
    if (!data) return;
    upsertSavedTree(data);
    setSavedMessage("Saved");
    setTimeout(() => setSavedMessage(null), 1500);
  }

  function handleDuplicate() {
    const data = getExportData();
    if (!data) return;
    upsertSavedTree(data);
    const copy = duplicateSavedTree(data.id);
    if (copy) {
      loadSavedTree(copy);
      onTreeLoaded();
    }
  }

  function handleExportJson() {
    const data = getExportData();
    if (!data) return;
    downloadTreeAsJson(data);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const raw = await file.text();
      const tree = importTreeFromFile(raw);
      loadSavedTree(tree);
      onTreeLoaded();
    } catch (error) {
      setImportError(error instanceof TreeImportError ? error.message : "Failed to import this file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExportPng() {
    const safeName = treeName.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-") || "casetree";
    await exportFlowAsPng(reactFlow, `${safeName}.png`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white/70 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-neutral-900/70">
      <button
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        onClick={onToggleSidebar}
      >
        Saved trees
      </button>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <div className="flex items-center rounded-lg border border-neutral-300 p-0.5 text-xs dark:border-neutral-700">
        {LEVELS.map(({ value, label }) => {
          const allowed = allowedLevels.includes(value);
          const active = detailLevel === value;
          return (
            <button
              key={value}
              disabled={!allowed}
              title={!allowed ? "Unlock by adding more case details" : undefined}
              onClick={() => setDetailLevel(value)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <button
        title="Undo"
        disabled={!canUndo}
        onClick={undo}
        className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        <UndoIcon />
      </button>
      <button
        title="Redo"
        disabled={!canRedo}
        onClick={redo}
        className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        <RedoIcon />
      </button>

      <button
        title="Regenerate entire tree"
        disabled={isBusy}
        onClick={() => regenerateRoot()}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        <RefreshIcon className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
        Regenerate tree
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {savedMessage && <span className="text-xs text-emerald-600 dark:text-emerald-400">{savedMessage}</span>}
        <button
          title="Save"
          onClick={handleSave}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          Save
        </button>
        <button
          title="Duplicate tree"
          onClick={handleDuplicate}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <CopyIcon />
        </button>
        <button
          title="Export as PNG"
          onClick={handleExportPng}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <ImageIcon />
        </button>
        <button
          title="Export as JSON"
          onClick={handleExportJson}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <DownloadIcon />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
        <button
          title="Import JSON"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <UploadIcon />
        </button>
        <button
          title="Toggle theme"
          onClick={toggle}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          onClick={onNewCase}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          New case
        </button>
      </div>

      {importError && (
        <div className="w-full rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {importError}
        </div>
      )}
    </div>
  );
}
