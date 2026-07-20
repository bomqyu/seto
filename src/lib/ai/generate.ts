import { z } from "zod";
import { CASETREE_MODEL, getGeminiClient } from "./client";
import {
  buildFollowUpGenerationPrompt,
  buildFullGenerationPrompt,
  buildRootRegenerationPrompt,
  buildSubtreeRegenerationPrompt,
  SYSTEM_PROMPT,
} from "./prompts";
import {
  CaseTreeResponseSchema,
  SubtreeResponseSchema,
  type CaseTreeNode,
  type CaseTreeResponse,
  type SubtreeResponse,
} from "./schema";

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

const MAX_OUTPUT_TOKENS = 32000;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

interface GeminiTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Calls Gemini with a JSON-schema output constraint (derived directly from
 * the given zod schema, so the shape we ask for and the shape we validate
 * against never drift), validates the result, and retries once (appending
 * the validation error as a follow-up turn) if validation fails. Throws
 * AIGenerationError if the second attempt also fails — callers must never
 * render a partial/invalid tree.
 */
async function callWithSchemaRetry<S extends z.ZodType>(
  schema: S,
  userPrompt: string,
): Promise<z.infer<S>> {
  const client = getGeminiClient();
  const responseJsonSchema = z.toJSONSchema(schema);

  const contents: GeminiTurn[] = [{ role: "user", parts: [{ text: userPrompt }] }];

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: CASETREE_MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          // Extended thinking draws from the same maxOutputTokens budget as
          // the final answer, and can silently eat most of it on a large
          // tree - the model then gets cut off mid-JSON. Our system prompt
          // already asks for the reasoning to be written out as real JSON
          // fields (hypothesis, framework rationale, coaching hints), so
          // hidden thinking tokens aren't needed here; disable them for
          // deterministic budgeting.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        const blockReason = response.promptFeedback?.blockReason;
        throw new Error(
          blockReason
            ? `The model declined to respond (${blockReason}).`
            : "The model returned an empty response.",
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (jsonError) {
        throw jsonError instanceof Error ? jsonError : new Error(String(jsonError));
      }

      const result = schema.safeParse(parsedJson);
      if (result.success) {
        return result.data;
      }

      lastError = result.error;
      contents.push({ role: "model", parts: [{ text: rawText }] });
      contents.push({
        role: "user",
        parts: [
          {
            text: `Your previous response did not match the required schema. Fix these\nvalidation errors and return a corrected, complete response (the same shape,\nnot a diff):\n${formatZodError(result.error)}`,
          },
        ],
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        contents.push({
          role: "user",
          parts: [
            {
              text: `Your previous response could not be parsed as valid JSON matching the\nrequired schema (${error instanceof Error ? error.message : String(error)}).\nPlease return a corrected, complete, valid JSON response.`,
            },
          ],
        });
      }
    }
  }

  throw new AIGenerationError(
    "The AI failed to produce a valid case tree after two attempts.",
    lastError,
  );
}

export async function generateCaseTree(params: {
  caseText: string;
  lockedNodes?: CaseTreeNode[];
}): Promise<CaseTreeResponse> {
  const prompt = buildFullGenerationPrompt(params);
  return callWithSchemaRetry(CaseTreeResponseSchema, prompt);
}

export async function generateFollowUpCaseTree(params: {
  originalCaseText: string;
  additionalInfo: string;
  lockedNodes?: CaseTreeNode[];
}): Promise<CaseTreeResponse> {
  const prompt = buildFollowUpGenerationPrompt(params);
  return callWithSchemaRetry(CaseTreeResponseSchema, prompt);
}

export async function regenerateRootTree(params: {
  caseText: string;
  lockedNodes: CaseTreeNode[];
}): Promise<CaseTreeResponse> {
  const prompt = buildRootRegenerationPrompt(params);
  return callWithSchemaRetry(CaseTreeResponseSchema, prompt);
}

export async function regenerateSubtree(params: {
  caseText: string;
  targetNode: CaseTreeNode;
  ancestorPath: CaseTreeNode[];
  siblingTitles: string[];
  lockedDescendants: CaseTreeNode[];
  maxDepth: number;
}): Promise<SubtreeResponse> {
  const prompt = buildSubtreeRegenerationPrompt(params);
  return callWithSchemaRetry(SubtreeResponseSchema, prompt);
}
