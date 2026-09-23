import { CHANNEL_LABELS, CHANNEL_ORDER } from "@/app/curated-links/utils/channels";
import { getDiscordData } from "@/app/curated-links/utils/discord-data";
import { dedupeByUrl, sortByNewestId } from "@/app/curated-links/utils/urlUtils";

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
  const { channels, linkData } = await getDiscordData();

  const sections = CHANNEL_ORDER.map((name) => {
    const links = dedupeByUrl(sortByNewestId(linkData[name] || [])).filter(
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

    return `## ${CHANNEL_LABELS[name]}\n\n${items}`;
  })
    .filter(Boolean)
    .join("\n\n");

  const body = `# Insights

A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more.

Source: ${BASE_URL}/curated-links

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