import Anthropic from "@anthropic-ai/sdk";

/**
 * Single point of contact with the Anthropic API. Nothing outside this
 * module (and generate.ts, which sits on top of it) should import
 * `@anthropic-ai/sdk` directly — that keeps the AI integration swappable
 * without touching route handlers or the tree-state layer.
 */

export const CASETREE_MODEL = "claude-sonnet-5";

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment (e.g. .env.local) before generating a tree.",
    );
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}
