import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// pdfjs-dist's Node fallback ("fake worker") dynamically imports its worker
// module relative to its own bundled chunk location, which breaks under
// Next.js's dev/production bundler (the chunk doesn't sit next to a real
// pdf.worker.mjs file). Pointing it at the package's actual on-disk file via
// an absolute file:// URL sidesteps that broken relative resolution.
GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs"),
).href;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No PDF file was provided." }, { status: 400 });
  }

  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "PDF is too large. Maximum upload size is 10MB." },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data });
    const result = await parser.getText();
    const text = result.text.trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No extractable text was found in this PDF. It may be a scanned or image-only document — please paste the case text directly instead.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("parse-pdf route error", error);
    return NextResponse.json(
      { error: "Failed to parse this PDF. Please paste the case text directly instead." },
      { status: 422 },
    );
  } finally {
    await parser?.destroy();
  }
}
