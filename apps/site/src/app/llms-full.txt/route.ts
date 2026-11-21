import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/app/insights/utils/categories";
import { getInsightsData } from "@/app/insights/utils/links-data";
import { dedupeByUrl, sortByNewest } from "@/app/insights/utils/urlUtils";

export const revalidate = 300;
// Render on request so the file reflects the live collection.
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";

/**
 * The whole curated collection as markdown, grouped by category, for agents and
 * anything else that would rather read text than scrape the page.
 */
export async function GET() {
  const { linkData } = await getInsightsData();

  const sections = CATEGORY_ORDER.map((name) => {
    const links = dedupeByUrl(sortByNewest(linkData[name] || [])).filter(
      (link) => link.url
    );
    if (links.length === 0) return null;

    const items = links
      .map((link) => {
        const description =
          link.description && link.description !== "No description available"
            ? ` — ${link.description.replace(/\s+/g, " ").trim()}`
            : "";
        return `- [${link.title}](${link.url})${description}`;
      })
      .join("\n");

    return `## ${CATEGORY_LABELS[name]}\n\n${items}`;
  })
    .filter(Boolean)
    .join("\n\n");

  const body = `# Insights

A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more.

Source: ${BASE_URL}/insights

${sections}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}