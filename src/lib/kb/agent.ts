import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { CHANNEL_ORDER } from "@/app/curated-links/utils/channels";
import { chatModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { search } from "./search";

/**
 * The agent. One tool, a capped number of steps, and the model pinned in
 * model.ts. `streamText` runs the loop itself: it calls the tool, feeds the
 * result back, and repeats until the model stops calling tools or the cap hits.
 *
 * The tool's output is the citation list. The UI renders link cards from that
 * output — never by scanning the model's prose for URLs — so the model cannot
 * surface a link the search didn't return.
 */

/** Max model round-trips per question (keeps a question near a tenth of a cent). */
const MAX_STEPS = 4;

/** How many links one search hands back to the model. */
const SEARCH_LIMIT = 6;

export const searchKnowledge = tool({
  description:
    "Search Sourav's curated collection of saved links by meaning. Returns the " +
    "most relevant saved links, each with the passage that matched. Use it to " +
    "find articles, tools, products or resources; call again with a better query " +
    "if the first results miss.",
  inputSchema: z.object({
    query: z.string().describe("What to look for, in plain words"),
    channel: z
      .enum(CHANNEL_ORDER as [string, ...string[]])
      .optional()
      .describe("Restrict the search to one channel"),
  }),
  execute: async ({ query, channel }) => {
    const hits = await search(query, { channel, limit: SEARCH_LIMIT });
    if (hits.length === 0) {
      return { matches: [], note: "No saved links matched that query." };
    }
    return {
      matches: hits.map((hit) => ({
        url: hit.url,
        title: hit.title,
        channel: hit.channel,
        passage: hit.passages[0]?.content ?? "",
      })),
    };
  },
});

/** Stream an answer for the given conversation. */
export async function runAgent(messages: UIMessage[]) {
  return streamText({
    model: chatModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { search_knowledge: searchKnowledge },
    stopWhen: stepCountIs(MAX_STEPS),
  });
}
