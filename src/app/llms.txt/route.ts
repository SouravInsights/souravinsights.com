export const revalidate = 3600;

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";

/**
 * Agent-facing index of the site (llmstxt.org convention): plain markdown so a
 * model can understand what lives here without scraping HTML.
 */
export function GET() {
  const body = `# Sourav Insights

> Personal site of Sourav Kumar Nanda (SouravInsights), a product engineer. Writing on design, engineering and life, plus a curated links collection, a reading library, films, side projects, and the tools I use.

## Pages

- [Home](${BASE_URL}/): Intro, companies I've worked with, side projects, recent essays, and tools I use
- [Projects](${BASE_URL}/projects): Side projects and notes about them
- [Blog](${BASE_URL}/blog): Essays on design, engineering, startups, and life
- [Insights](${BASE_URL}/insights): A constantly updating collection of links worth keeping — articles, tools, portfolios and more
- [Books](${BASE_URL}/books): Books I'm reading and have read
- [Movies](${BASE_URL}/movies): Films that stayed with me
- [Play](${BASE_URL}/play): Small browser experiments

## Feeds

- [Insights RSS](${BASE_URL}/insights/rss.xml): New links as they're added

## API

- [Docs](${BASE_URL}/docs): How to query the collection — search by meaning, read the paginated list, or connect an MCP client
- [Search](${BASE_URL}/api/v1/search): Semantic search over what the saved pages say, not their titles — GET /api/v1/search?q=…&channel=…&limit=…
- [Links API](${BASE_URL}/api/v1/links): Read-only JSON for the collection — GET /api/v1/links (channel, cursor, url params), GET /api/v1/channels
- [MCP server](${BASE_URL}/api/mcp): Model Context Protocol endpoint exposing one tool, search_knowledge, for editors and assistants
- [API docs](${BASE_URL}/api/docs): Interactive OpenAPI reference (spec at /api/v1/openapi.json)

## Full content

- [llms-full.txt](${BASE_URL}/llms-full.txt): The curated links collection in markdown
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}