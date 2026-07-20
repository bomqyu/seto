import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { CASETREE_MODEL, getAnthropicClient } from "./client";
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

const MAX_TOKENS = 16000;

function extractText(content: { type: string; text?: string }[]): string {
  const textBlock = content.find((b) => b.type === "text" && typeof b.text === "string");
  if (!textBlock?.text) {
    throw new AIGenerationError("Model response contained no text content.");
  }
  return textBlock.text;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

/**
 * Calls Claude with a JSON-schema output constraint, validates the result with
 * the given zod schema, and retries once (appending the validation error to a
 * follow-up turn) if validation fails. Throws AIGenerationError if the second
 * attempt also fails — callers must never render a partial/invalid tree.
 */
async function callWithSchemaRetry<S extends z.ZodType>(
  schema: S,
  userPrompt: string,
): Promise<z.infer<S>> {
  const client = getAnthropicClient();
  const format = zodOutputFormat(schema);

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userPrompt },
  ];

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: CASETREE_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
        output_config: { format },
      });

      const rawText = extractText(response.content as { type: string; text?: string }[]);

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
      messages.push({ role: "assistant", content: rawText });
      messages.push({
        role: "user",
        content: `Your previous response did not match the required schema. Fix these\nvalidation errors and return a corrected, complete response (the same shape,\nnot a diff):\n${formatZodError(result.error)}`,
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        messages.push({
          role: "user",
          content: `Your previous response could not be parsed as valid JSON matching the\nrequired schema (${error instanceof Error ? error.message : String(error)}).\nPlease return a corrected, complete, valid JSON response.`,
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
