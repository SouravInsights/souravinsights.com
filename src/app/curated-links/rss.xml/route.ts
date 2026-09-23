import { CHANNEL_LABELS, CHANNEL_ORDER } from "../utils/channels";
import { getDiscordData } from "../utils/discord-data";
import { dedupeByUrl, snowflakeDate, sortByNewestId } from "../utils/urlUtils";

export const revalidate = 300;
// Render on request so the feed reflects the live collection rather than being
// frozen at build time.
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";

// A feed reader only needs the recent stuff; the full history lives on the page.
const MAX_ITEMS = 60;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { channels, linkData } = await getDiscordData();

  const categoryById = new Map<string, string>();
  for (const name of CHANNEL_ORDER) {
    for (const link of linkData[name] || []) {
      categoryById.set(link.id, CHANNEL_LABELS[name]);
    }
  }

  const links = dedupeByUrl(
    sortByNewestId(
      channels.flatMap((channel) => linkData[channel.name] || [])
    )
  )
    .filter((link) => link.url)
    .slice(0, MAX_ITEMS);

  const items = links
    .map((link) => {
      const category = categoryById.get(link.id);
      const description = [category, link.description]
        .filter(Boolean)
        .join(" — ");

      return [
        "    <item>",
        `      <title>${escapeXml(link.title)}</title>`,
        `      <link>${escapeXml(link.url)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(link.id)}</guid>`,
        description
          ? `      <description>${escapeXml(description)}</description>`
          : null,
        `      <pubDate>${snowflakeDate(link.id).toUTCString()}</pubDate>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Insights | SouravInsights</title>
    <link>${BASE_URL}/curated-links</link>
    <description>A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/curated-links/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}