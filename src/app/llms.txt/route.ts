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
- [Insights](${BASE_URL}/curated-links): A constantly updating collection of links worth keeping — articles, tools, portfolios and more
- [Books](${BASE_URL}/books): Books I'm reading and have read
- [Movies](${BASE_URL}/movies): Films that stayed with me
- [Play](${BASE_URL}/play): Small browser experiments

## Feeds

- [Insights RSS](${BASE_URL}/curated-links/rss.xml): New links as they're added

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