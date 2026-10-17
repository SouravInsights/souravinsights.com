import * as ai from "ai";
import { wrapAISDK } from "neatlogs/ai";

/**
 * The AI SDK, with Neatlogs recording every call.
 *
 * Neatlogs cannot see AI SDK calls on its own. It gives us `wrapAISDK`, which
 * returns the same functions (`streamText`, `embedMany`, `generateObject`, …)
 * with recording switched on inside them.
 *
 * So any file that talks to a model imports the function from here, not from
 * `"ai"`. The function, its arguments and its result are all the same — it just
 * also reports the call to Neatlogs.
 *
 * Docs: https://docs.neatlogs.com/integrations/vercel-ai
 */
export const {
  generateText,
  streamText,
  generateObject,
  streamObject,
  embed,
  embedMany,
  rerank,
} = wrapAISDK(ai);

/**
 * Send any recorded spans that are still waiting in memory.
 *
 * Neatlogs collects spans and sends them in batches every few seconds. On
 * Vercel the server can be paused between requests, so a batch still waiting
 * would be lost. Calling this once the request's work is done sends it right
 * away. It never throws: recording must not break the app's own answer.
 *
 * Docs: https://docs.neatlogs.com/sdk/lifecycle
 */
export async function flushTraces(): Promise<void> {
  try {
    const { flush } = await import("neatlogs");
    await flush();
  } catch {
    // Ignore: a failed trace must never affect the response.
  }
}
