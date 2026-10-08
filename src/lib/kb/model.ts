import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * The one file that names our models. Every other KB file imports from here, so
 * swapping a model is a one-line change in one place.
 *
 * Two models, two jobs:
 *
 * 1. EMBEDDING_MODEL_ID — turns a passage of text into 1536 numbers (a vector).
 *    "Similar meaning" becomes "similar numbers". The count (1536) matches the
 *    `vector(1536)` column in `link_chunks`, so changing this model means
 *    re-embedding every passage.
 *
 * 2. CHAT_MODEL_ID — the model that writes the answers. It MUST support tool
 *    calling, because the agent works by calling a search tool mid-answer. If
 *    the id ever changes, check that `tools` is in the model's
 *    `supported_parameters` on OpenRouter or the agent stops working.
 */

export const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small";
export const CHAT_MODEL_ID = "openai/gpt-4o-mini";

/**
 * Used by one offline script, `scripts/kb-suggestions.ts`, which writes the Ask
 * panel's suggestion chips. It is deliberately not the chat model: a chip is the
 * only copy here with no retrieval to hide behind, and gpt-4o-mini writes topics
 * ("updates on React Native development") where this model writes hooks ("what
 * Amit Varma and Ajay Shah cited most across 128 episodes"). The script runs by
 * hand, a few times a year: seven calls ≈ $0.25, against ~$0.001 per live query
 * for the chat model, which is why the split exists at all.
 */
export const SUGGESTION_MODEL_ID = "anthropic/claude-sonnet-4.6";

/**
 * Built lazily so importing this file never throws when the key is absent
 * (e.g. during a Next build step that never touches the models).
 */
function client() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return createOpenRouter({ apiKey });
}

/** The embedding model, for turning text into vectors. */
export const embeddingModel = () =>
  client().textEmbeddingModel(EMBEDDING_MODEL_ID);

/** The chat model, for the agent that writes answers. */
export const chatModel = () => client()(CHAT_MODEL_ID);

/** The copy model, for the offline script that writes the suggestion chips. */
export const suggestionModel = () => client()(SUGGESTION_MODEL_ID);
