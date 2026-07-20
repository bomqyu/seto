"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Toolbar from "./Toolbar";
import TreeCanvas from "./TreeCanvas";
import FrameworkPanel from "./FrameworkPanel";
import CoachingPanel from "./CoachingPanel";
import MissingInfoBanner from "./MissingInfoBanner";
import SavedTreesSidebar from "./SavedTreesSidebar";
import { useTreeStore } from "@/lib/tree/store";

export default function TreeWorkspace({ onNewCase }: { onNewCase: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const error = useTreeStore((s) => s.error);
  const clearError = useTreeStore((s) => s.clearError);

  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <Toolbar
          onNewCase={onNewCase}
          onTreeLoaded={() => setSidebarOpen(false)}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        {error && (
          <div className="flex items-center justify-between gap-3 border-b border-red-300 bg-red-50 px-4 py-2 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <span>{error}</span>
            <button className="shrink-0 underline underline-offset-2" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          {sidebarOpen && (
            <SavedTreesSidebar onClose={() => setSidebarOpen(false)} onOpenTree={() => setSidebarOpen(false)} />
          )}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="px-3 pt-3 lg:hidden">
              <MissingInfoBanner />
            </div>
            <div className="min-h-0 flex-1">
              <TreeCanvas />
            </div>
            <button
              className="absolute bottom-4 right-4 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg lg:hidden dark:bg-white dark:text-neutral-900"
              onClick={() => setDetailsOpen(true)}
            >
              Framework & coaching
            </button>
            {detailsOpen && (
              <div className="absolute inset-0 z-40 flex flex-col bg-[var(--background)] lg:hidden">
                <div className="flex items-center justify-between border-b border-black/10 p-3 dark:border-white/10">
                  <h2 className="text-sm font-semibold">Framework & coaching</h2>
                  <button className="text-xs text-neutral-500" onClick={() => setDetailsOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  <FrameworkPanel />
                  <CoachingPanel />
                </div>
              </div>
            )}
          </div>
          <aside className="hidden w-80 shrink-0 space-y-3 overflow-y-auto border-l border-black/10 p-3 dark:border-white/10 lg:block">
            <MissingInfoBanner />
            <FrameworkPanel />
            <CoachingPanel />
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
