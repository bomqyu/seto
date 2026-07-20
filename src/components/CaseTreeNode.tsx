"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CaseFlowNode } from "@/lib/tree/layout";
import { getCategoryColors } from "@/lib/tree/color";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useTreeStore } from "@/lib/tree/store";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  LockIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UnlockIcon,
} from "./icons";

function NodeTooltip({
  detailLevel,
  caseNode,
}: {
  detailLevel: CaseFlowNode["data"]["detailLevel"];
  caseNode: CaseFlowNode["data"]["caseNode"];
}) {
  const tooltip = caseNode.tooltip;
  if (!tooltip) return null;

  const rows: [string, string | undefined][] = [
    ["Hypothesis", tooltip.hypothesis],
    ["Analysis", tooltip.analysis],
    ["Data needed", tooltip.dataNeeded],
  ];
  if (detailLevel === "high") {
    rows.push(["Metrics", tooltip.metrics], ["Risks", tooltip.risks], ["Coaching hint", tooltip.coachingHints]);
  }
  const visibleRows = rows.filter(([, value]) => !!value);
  if (visibleRows.length === 0) return null;

  return (
    <div className="nodrag nowheel pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 rounded-lg border border-black/10 bg-white p-3 text-left text-xs leading-relaxed text-neutral-700 opacity-0 shadow-xl transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200">
      {visibleRows.map(([label, value]) => (
        <p key={label} className="mb-1.5 last:mb-0">
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">{label}: </span>
          {value}
        </p>
      ))}
    </div>
  );
}

function CaseTreeNodeComponent({ id, data }: NodeProps<CaseFlowNode>) {
  const { caseNode, detailLevel, hasChildren, childCount, isCollapsed, isRoot } = data;
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(caseNode.title);
  const [draftExplanation, setDraftExplanation] = useState(caseNode.explanation ?? "");

  const addNode = useTreeStore((s) => s.addNode);
  const deleteNode = useTreeStore((s) => s.deleteNode);
  const editNodeAction = useTreeStore((s) => s.editNode);
  const toggleLock = useTreeStore((s) => s.toggleLock);
  const toggleCollapse = useTreeStore((s) => s.toggleCollapse);
  const regenerateNode = useTreeStore((s) => s.regenerateNode);
  const regeneratingNodeId = useTreeStore((s) => s.regeneratingNodeId);

  const colors = getCategoryColors(caseNode.category, theme);
  const isRegenerating = regeneratingNodeId === caseNode.id;
  const locked = !!caseNode.locked;

  function startEditing() {
    setDraftTitle(caseNode.title);
    setDraftExplanation(caseNode.explanation ?? "");
    setEditing(true);
  }

  function saveEditing() {
    editNodeAction(caseNode.id, {
      title: draftTitle.trim() || caseNode.title,
      explanation: draftExplanation,
    });
    setEditing(false);
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 260 }}
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          className="!bg-neutral-400 !border-none !h-2 !w-2"
          style={{ pointerEvents: "none" }}
        />
      )}

      <div
        className="rounded-2xl border-2 px-3.5 py-2.5 shadow-sm transition-shadow"
        style={{
          borderColor: colors.border,
          background: colors.background,
          boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: colors.border }}
          />
          <span
            className="truncate text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: colors.text }}
          >
            {caseNode.category}
          </span>
          {locked && <LockIcon className="ml-auto h-3 w-3 shrink-0 text-neutral-500" />}
        </div>

        {editing ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              className="nodrag w-full rounded border border-neutral-300 bg-white px-1.5 py-1 text-sm font-semibold text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            {detailLevel !== "low" && (
              <textarea
                className="nodrag w-full resize-none rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                rows={2}
                value={draftExplanation}
                onChange={(e) => setDraftExplanation(e.target.value)}
                placeholder="Explanation"
              />
            )}
            <div className="flex justify-end gap-1.5 pt-0.5">
              <button
                className="nodrag rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                className="nodrag rounded bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                onClick={saveEditing}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
              {caseNode.title}
            </p>
            {detailLevel !== "low" && caseNode.explanation && (
              <p className="mt-1 line-clamp-3 text-xs leading-snug text-neutral-600 dark:text-neutral-300">
                {caseNode.explanation}
              </p>
            )}
          </>
        )}
      </div>

      {detailLevel !== "low" && !editing && <NodeTooltip detailLevel={detailLevel} caseNode={caseNode} />}

      {!editing && (hovered || isRegenerating) && (
        <div className="nodrag absolute -top-3 right-1 flex items-center gap-0.5 rounded-full border border-black/10 bg-white px-1 py-0.5 shadow-md dark:border-white/10 dark:bg-neutral-800">
          <button
            title={locked ? "Unlock" : "Lock"}
            className="rounded-full p-1 text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={() => toggleLock(caseNode.id)}
          >
            {locked ? <UnlockIcon /> : <LockIcon />}
          </button>
          {!locked && (
            <>
              <button
                title="Edit"
                className="rounded-full p-1 text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={startEditing}
              >
                <EditIcon />
              </button>
              <button
                title="Regenerate this branch"
                disabled={isRegenerating}
                className="rounded-full p-1 text-neutral-500 hover:bg-black/5 hover:text-neutral-900 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => regenerateNode(caseNode.id)}
              >
                <RefreshIcon className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              </button>
              {!isRoot && (
                <button
                  title="Delete"
                  className="rounded-full p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  onClick={() => deleteNode(caseNode.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!editing && childCount < 3 && (
        <button
          title="Add child issue"
          className="nodrag absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-500 opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:text-neutral-900 dark:border-white/10 dark:bg-neutral-800 dark:hover:text-white"
          onClick={() => addNode(caseNode.id)}
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      )}

      {hasChildren && (
        <button
          title={isCollapsed ? "Expand" : "Collapse"}
          className="nodrag absolute -bottom-3 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-500 shadow-md hover:text-neutral-900 dark:border-white/10 dark:bg-neutral-800 dark:hover:text-white"
          onClick={() => toggleCollapse(id)}
        >
          {isCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!bg-neutral-400 !border-none !h-2 !w-2"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}

export default memo(CaseTreeNodeComponent);
