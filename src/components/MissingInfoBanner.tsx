"use client";

import { useState } from "react";
import { useTreeStore } from "@/lib/tree/store";

export default function MissingInfoBanner() {
  const confidenceLevel = useTreeStore((s) => s.confidenceLevel);
  const confidenceScore = useTreeStore((s) => s.confidenceScore);
  const missingInformation = useTreeStore((s) => s.missingInformation);
  const submitFollowUp = useTreeStore((s) => s.submitFollowUp);
  const status = useTreeStore((s) => s.status);

  const [additionalInfo, setAdditionalInfo] = useState("");
  const [open, setOpen] = useState(true);

  if (confidenceLevel !== "low") return null;

  const isLoading = status === "loading";

  function handleSubmit() {
    if (!additionalInfo.trim() || isLoading) return;
    submitFollowUp(additionalInfo.trim());
    setAdditionalInfo("");
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Low confidence ({confidenceScore}/100) — this is a preliminary tree
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            The case prompt is missing:{" "}
            <span className="font-medium">
              {(missingInformation.length > 0 ? missingInformation : ["key details"]).join(", ")}
            </span>
            . Detail level is locked to Low until you add more information and regenerate.
          </p>
        </div>
        <button
          className="shrink-0 text-xs font-medium text-amber-800 underline underline-offset-2 dark:text-amber-300"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Add details"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea
            className="min-h-[60px] flex-1 resize-y rounded-lg border border-amber-300 bg-white p-2 text-sm text-neutral-900 outline-none focus:border-amber-500 dark:border-amber-500/40 dark:bg-neutral-950 dark:text-neutral-100"
            placeholder="e.g. Industry: mid-size regional airline. Objective: recover profitability within 18 months..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            disabled={isLoading}
          />
          <button
            className="shrink-0 self-end rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-stretch"
            onClick={handleSubmit}
            disabled={isLoading || !additionalInfo.trim()}
          >
            {isLoading ? "Regenerating…" : "Regenerate tree"}
          </button>
        </div>
      )}
    </div>
  );
}
