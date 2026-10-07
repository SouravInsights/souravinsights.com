import "./load-env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CHANNEL_ORDER } from "../src/app/curated-links/utils/channels";
import { search } from "../src/lib/kb/search";

/**
 * The collection, inside whatever assistant I'm already working in.
 *
 * An MCP server over stdio exposing one tool, `search_knowledge`. It calls the
 * same `search()` the site's agent calls, so a question asked in Cursor and a
 * question asked on the page retrieve the same passages. Nothing new is stored,
 * nothing new is computed — which is the whole point. This is the honest test of
 * the claim the knowledge base rests on: retrieval is the layer, and every
 * surface is just a way in.
 *
 *   npx tsx scripts/kb-mcp.ts        # speaks MCP on stdin/stdout
 *
 * Client setup lives in `docs/kb/03-retrieval-and-agent.md`.
 */

// stdio *is* the protocol channel here. One stray print corrupts the handshake,
// and the failure the client reports is "server disconnected" with no clue why —
// so anything our dependencies decide to log goes to stderr instead.
console.log = (...args: unknown[]) => console.error(...args);

/** Links per search: enough to choose from, few enough to actually read. */
const DEFAULT_LIMIT = 6;
/** Passage length per link — the matched text, not the whole page. */
const PASSAGE_CHARS = 700;

async function main() {
  const server = new McpServer({
    name: "souravinsights-collection",
    version: "1.0.0",
  });

  server.registerTool(
    "search_knowledge",
    {
      title: "Search my saved links",
      description:
        "Search a curated collection of saved links — articles, tools, products, " +
        "resources, newsletters and design references — by the *contents* of the " +
        "pages instead of their titles. Use it when I ask what I've saved about " +
        "something, want a tool or a source for a job, or need reference material " +
        "while writing. Returns matched links with the passage that matched, so " +
        "anything quoted can be attributed.",
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
                `Nothing in the collection matches "${query}". ` +
                `Say so rather than suggesting something else — the collection ` +
                `is only what I chose to save.`,
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

  const transport = new StdioServerTransport();

  // When the client closes the pipe we are done. Without this the process
  // lingers, because the Postgres pool still holds a socket open.
  transport.onclose = () => process.exit(0);

  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
