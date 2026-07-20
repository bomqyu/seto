import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AIGenerationError,
  generateCaseTree,
  generateFollowUpCaseTree,
  regenerateRootTree,
  regenerateSubtree,
} from "@/lib/ai/generate";
import { CaseTreeNodeSchema } from "@/lib/ai/schema";

export const runtime = "nodejs";

const MAX_CASE_TEXT_LENGTH = 6000;

const caseTextSchema = z.string().min(1).max(MAX_CASE_TEXT_LENGTH);

const RequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("full"),
    caseText: caseTextSchema,
    lockedNodes: z.array(CaseTreeNodeSchema).optional(),
  }),
  z.object({
    mode: z.literal("followup"),
    originalCaseText: caseTextSchema,
    additionalInfo: z.string().min(1).max(MAX_CASE_TEXT_LENGTH),
    lockedNodes: z.array(CaseTreeNodeSchema).optional(),
  }),
  z.object({
    mode: z.literal("regenerate-root"),
    caseText: caseTextSchema,
    lockedNodes: z.array(CaseTreeNodeSchema),
  }),
  z.object({
    mode: z.literal("regenerate-subtree"),
    caseText: caseTextSchema,
    targetNode: CaseTreeNodeSchema,
    ancestorPath: z.array(CaseTreeNodeSchema),
    siblingTitles: z.array(z.string()),
    lockedDescendants: z.array(CaseTreeNodeSchema),
    maxDepth: z.number().int().min(1).max(5),
  }),
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    switch (input.mode) {
      case "full": {
        const result = await generateCaseTree({
          caseText: input.caseText,
          lockedNodes: input.lockedNodes,
        });
        return NextResponse.json(result);
      }
      case "followup": {
        const result = await generateFollowUpCaseTree({
          originalCaseText: input.originalCaseText,
          additionalInfo: input.additionalInfo,
          lockedNodes: input.lockedNodes,
        });
        return NextResponse.json(result);
      }
      case "regenerate-root": {
        const result = await regenerateRootTree({
          caseText: input.caseText,
          lockedNodes: input.lockedNodes,
        });
        return NextResponse.json(result);
      }
      case "regenerate-subtree": {
        const result = await regenerateSubtree({
          caseText: input.caseText,
          targetNode: input.targetNode,
          ancestorPath: input.ancestorPath,
          siblingTitles: input.siblingTitles,
          lockedDescendants: input.lockedDescendants,
          maxDepth: input.maxDepth,
        });
        return NextResponse.json(result);
      }
    }
  } catch (error) {
    if (error instanceof AIGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("generate-tree route error", error);
    return NextResponse.json(
      { error: "Something went wrong generating the tree. Please try again." },
      { status: 500 },
    );
  }
}
