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
import { readPageFresh } from "./fetch-link";

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

/** How many pages one question may read fresh from the web. */
const MAX_FETCHES = 3;

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
    tools: { search_knowledge: searchKnowledge, fetch_link: fetchLinkTool() },
    stopWhen: stepCountIs(MAX_STEPS),
  });
}

/**
 * Read a page fresh, for details the stored passages don't have — today's
 * pricing, a changelog, a spec table. This is Compare's extra reach.
 *
 * The budget lives in a closure, so it is per question rather than per process:
 * each call is a server-side request to an address the *model* chose, and the
 * model has just read untrusted page text. Three is enough for a comparison and
 * far too few to be a useful scanner.
 *
 * Errors come back as data rather than thrown, so the model can say what went
 * wrong and carry on with what it already has.
 */
export function fetchLinkTool() {
  let used = 0;

  return tool({
    description:
      "Read a saved link's page fresh from the web, for details the stored " +
      "passages do not have — current pricing, a changelog, a spec table. Reads " +
      "plain HTML only, so JavaScript-only pages come back unreadable. At most 3 " +
      "pages per question, so read the ones that matter.",
    inputSchema: z.object({
      url: z.string().url().describe("The page to read"),
    }),
    execute: async ({ url }) => {
      if (used >= MAX_FETCHES) {
        return {
          error: `Already read ${MAX_FETCHES} pages for this question — answer from those.`,
        };
      }
      used++;

      try {
        const page = await readPageFresh(url);
        return { url: page.url, title: page.title, text: page.text };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Could not read that page.",
        };
      }
    },
  });
}
