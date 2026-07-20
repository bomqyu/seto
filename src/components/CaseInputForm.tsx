"use client";

import { useRef, useState } from "react";
import { UploadIcon, SparkleIcon } from "./icons";

const MAX_CASE_TEXT_LENGTH = 6000;

export default function CaseInputForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (caseText: string) => void;
  isLoading: boolean;
}) {
  const [caseText, setCaseText] = useState("");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const overLimit = caseText.length > MAX_CASE_TEXT_LENGTH;
  const canSubmit = caseText.trim().length > 0 && !overLimit && !isLoading && !isParsingPdf;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    setIsParsingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setPdfError(json.error ?? "Failed to parse this PDF.");
        return;
      }
      setCaseText((prev) =>
        (prev ? `${prev}\n\n${json.text}` : (json.text as string)).slice(0, MAX_CASE_TEXT_LENGTH),
      );
    } catch {
      setPdfError("Failed to upload this PDF. Please try again or paste the text directly.");
    } finally {
      setIsParsingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(caseText.trim());
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Paste a case prompt or upload a PDF
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          CaseTree classifies the case, forms a hypothesis, picks the right framework, and
          builds a MECE issue tree you can explore and edit.
        </p>
      </div>

      <textarea
        className="min-h-[180px] w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        placeholder="e.g. Our client is a regional grocery chain whose profits have declined 20% over the last two years..."
        value={caseText}
        onChange={(e) => setCaseText(e.target.value)}
        disabled={isLoading}
      />

      <div className="flex items-center justify-between text-xs">
        <span className={overLimit ? "font-medium text-red-600" : "text-neutral-400"}>
          {caseText.length.toLocaleString()} / {MAX_CASE_TEXT_LENGTH.toLocaleString()} characters
          {overLimit ? " — please shorten your prompt" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsingPdf || isLoading}
        >
          <UploadIcon />
          {isParsingPdf ? "Extracting text…" : "Upload PDF"}
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <SparkleIcon className="h-3.5 w-3.5" />
          {isLoading ? "Building your tree…" : "Generate issue tree"}
        </button>
      </div>

      {pdfError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {pdfError}
        </p>
      )}
    </div>
  );
}
