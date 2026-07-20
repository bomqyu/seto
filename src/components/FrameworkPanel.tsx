"use client";

import { useTreeStore } from "@/lib/tree/store";

function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const styles: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    moderate: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    low: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[level] ?? ""}`}>
      {level} · {score}/100
    </span>
  );
}

export default function FrameworkPanel() {
  const caseType = useTreeStore((s) => s.caseType);
  const hypothesis = useTreeStore((s) => s.hypothesis);
  const confidenceLevel = useTreeStore((s) => s.confidenceLevel);
  const confidenceScore = useTreeStore((s) => s.confidenceScore);
  const framework = useTreeStore((s) => s.framework);

  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Framework transparency
      </h3>

      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Case type</dt>
          <dd className="text-neutral-900 dark:text-neutral-50">{caseType}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Framework chosen</dt>
          <dd className="font-medium text-neutral-900 dark:text-neutral-50">{framework.name}</dd>
          <dd className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            {framework.reason}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Primary hypothesis</dt>
          <dd className="text-neutral-900 dark:text-neutral-50">{hypothesis}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Confidence</dt>
          <dd className="mt-1">
            <ConfidenceBadge level={confidenceLevel} score={confidenceScore} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
