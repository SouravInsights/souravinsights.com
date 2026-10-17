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
