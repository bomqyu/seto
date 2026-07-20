"use client";

import { useState } from "react";
import CaseInputForm from "@/components/CaseInputForm";
import TreeWorkspace from "@/components/TreeWorkspace";
import { useTreeStore } from "@/lib/tree/store";
import { useTheme } from "@/lib/theme/ThemeContext";
import { MoonIcon, SunIcon } from "@/components/icons";

export default function Home() {
  const hasTree = useTreeStore((s) => s.hasTree());
  const status = useTreeStore((s) => s.status);
  const error = useTreeStore((s) => s.error);
  const generateFull = useTreeStore((s) => s.generateFull);
  const reset = useTreeStore((s) => s.reset);
  const clearError = useTreeStore((s) => s.clearError);
  const { theme, toggle } = useTheme();

  const [lastCaseText, setLastCaseText] = useState("");

  function handleSubmit(caseText: string) {
    setLastCaseText(caseText);
    clearError();
    generateFull(caseText);
  }

  function handleRetry() {
    if (lastCaseText) generateFull(lastCaseText);
  }

  if (hasTree) {
    return <TreeWorkspace onNewCase={reset} />;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <button
        title="Toggle theme"
        onClick={toggle}
        className="absolute right-4 top-4 rounded-lg p-2 text-neutral-500 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Case<span className="text-emerald-600 dark:text-emerald-400">Tree</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          AI-powered consulting case interview prep — turn any case into a visual, MBB-style
          issue tree.
        </p>
      </div>

      <CaseInputForm onSubmit={handleSubmit} isLoading={status === "loading"} />

      {status === "error" && error && (
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            onClick={handleRetry}
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
