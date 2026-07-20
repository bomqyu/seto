import { GoogleGenAI } from "@google/genai";

/**
 * Single point of contact with the Gemini API. Nothing outside this module
 * (and generate.ts, which sits on top of it) should import `@google/genai`
 * directly — that keeps the AI integration swappable without touching route
 * handlers or the tree-state layer.
 */

export const CASETREE_MODEL = "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment (e.g. .env.local) before generating a tree.",
    );
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}
