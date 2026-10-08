import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CHANNEL_ORDER } from "@/app/insights/utils/channels";
import { search } from "./search";

/**
 * The collection as an MCP server: one tool, `search_knowledge`, over the same
 * `search()` the site's agent calls.
 *
 * Defined once and mounted twice — `scripts/kb-mcp.ts` speaks it over stdio for
 * local use in Cursor or Claude Desktop, and `src/pages/api/mcp.ts` serves it
 * over HTTP so anyone can point their own client at it. Two definitions would
 * drift, and the entire claim here is that there is only one retrieval path.
 */

export const COLLECTION_SERVER = {
  name: "souravinsights-collection",
  version: "1.0.0",
} as const;

/** Links per search: enough to choose from, few enough to actually read. */
const DEFAULT_LIMIT = 6;
/** Passage length per link — the matched text, not the whole page. */
const PASSAGE_CHARS = 700;

export function createCollectionServer(): McpServer {
  const server = new McpServer(COLLECTION_SERVER);

  server.registerTool(
    "search_knowledge",
    {
      title: "Search my saved links",
      description:
        "Search a curated collection of saved links — articles, tools, products, " +
        "resources, newsletters and design references — by the *contents* of the " +
        "pages instead of their titles. Use it when someone asks what has been " +
        "saved about something, wants a tool or a source for a job, or needs " +
        "reference material while writing. Returns matched links with the passage " +
        "that matched, so anything quoted can be attributed.",
      inputSchema: {
        query: z.string().describe("What to look for, in plain words"),
        channel: z
          .enum(CHANNEL_ORDER as [string, ...string[]])
          .optional()
          .describe("Restrict the search to one channel"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe(`How many links to return (default ${DEFAULT_LIMIT})`),
      },
    },
    async ({ query, channel, limit }) => {
      const hits = await search(query, {
        channel,
        limit: limit ?? DEFAULT_LIMIT,
      });

      if (hits.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Nothing in the collection matches "${query}". Say so rather than ` +
                `suggesting something else — the collection is only what was ` +
                `chosen to be saved.`,
            },
          ],
        };
      }

      const body = hits
        .map((hit, index) => {
          const passage = (hit.passages[0]?.content ?? "")
            .slice(0, PASSAGE_CHARS)
            .replace(/\s+/g, " ");
          return [
            `${index + 1}. ${hit.title}`,
            `   ${hit.url}`,
            `   channel: ${hit.channel}  ·  similarity: ${hit.score.toFixed(3)}`,
            `   ${passage}`,
          ].join("\n");
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `${hits.length} saved link(s) for "${query}":\n\n${body}`,
          },
        ],
      };
    }
  );

  return server;
}
