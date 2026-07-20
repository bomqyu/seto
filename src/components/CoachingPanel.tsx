"use client";

import { useMemo } from "react";
import { useTreeStore } from "@/lib/tree/store";
import { computeCoverageDiff } from "@/lib/tree/coverage";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-50">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FindingsList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-neutral-600 dark:text-neutral-400">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CoachingPanel() {
  const coaching = useTreeStore((s) => s.coaching);
  const nodes = useTreeStore((s) => s.nodes);
  const originalSnapshotNodes = useTreeStore((s) => s.originalSnapshotNodes);

  const coverage = useMemo(
    () => computeCoverageDiff(originalSnapshotNodes, nodes),
    [originalSnapshotNodes, nodes],
  );

  const scores = {
    ...coaching.scores,
    coverage: coverage.coverageScore,
  };

  const missingBranches =
    coverage.missingBranches.length > 0 ? coverage.missingBranches : coaching.missingBranches;

  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        MBB coaching
      </h3>

      <div className="space-y-2.5">
        <ScoreBar label="MECE" score={scores.mece} />
        <ScoreBar label="Coverage" score={scores.coverage} />
        <ScoreBar label="Logic" score={scores.logic} />
        <ScoreBar label="Prioritization" score={scores.prioritization} />
        <ScoreBar label="Interview readiness" score={scores.interviewReadiness} />
      </div>

      <div className="mt-4 space-y-3">
        <FindingsList title="Missing branches" items={missingBranches} />
        <FindingsList title="Weak logic" items={coaching.weakLogicFlags} />
        <FindingsList title="Overlapping branches" items={coaching.overlapFlags} />
        <FindingsList title="Suggestions" items={coaching.suggestions} />
      </div>
    </div>
  );
}
