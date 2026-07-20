# CaseTree

CaseTree turns a case interview prompt (or an uploaded PDF) into an interactive,
MBB-style MECE issue tree: it classifies the case, forms a hypothesis, picks a
tailored framework, builds a draggable React Flow tree, and coaches you on it.

Single-user, no-login v1 — all trees live in the browser (React state +
`localStorage`), with JSON export/import as a portable backup/share format.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Used only server-side in Route Handlers — never exposed to the client. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |

## Project structure

- `src/lib/ai/` — the AI-calling module: zod schema (`schema.ts`), prompt
  builders (`prompts.ts`), and the Gemini client + schema-validated
  generation calls with one retry on validation failure (`generate.ts`). The
  JSON schema sent to the model is derived directly from the zod schema
  (`z.toJSONSchema`), so the requested shape and the validated shape never
  drift apart.
- `src/lib/tree/` — the tree-state module: the zustand store (`store.ts`,
  undo/redo, locking, drag overrides, detail level), dagre auto-layout +
  deterministic category colors (`layout.ts`, `color.ts`), coverage diffing
  against the original AI snapshot (`coverage.ts`), locked-node reconciliation
  after a regeneration (`reconcile.ts`), and pure tree-array helpers (`ops.ts`).
- `src/lib/storage/` — `localStorage` persistence for saved trees, plus JSON
  export/import.
- `src/lib/export/png.ts` — PNG export of the React Flow canvas.
- `src/app/api/generate-tree/` and `src/app/api/parse-pdf/` — Route Handlers;
  the only places the Gemini API key and `pdf-parse` are used.
- `src/components/` — React Flow canvas + custom node, input form, toolbar,
  framework/coaching panels, saved-trees sidebar.

These layers are intentionally decoupled — swapping local storage for a
database, or adding accounts/billing/Interviewer Mode later, shouldn't require
touching the AI or tree-state modules.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
