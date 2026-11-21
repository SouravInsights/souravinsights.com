import { getLinks } from "@/lib/links/queries";
import { isCategory } from "@/lib/kb/categories";
import { CATEGORY_ORDER } from "./categories";
import type { LinkData } from "./discordApi";

/** One filter group on the page — a category, with the label the UI shows. */
export interface InsightsGroup {
  id: string;
  name: string;
}

export type InsightsLink = LinkData & {
  addedAt: Date;
  urlKey: string;
  category: string;
  topics: string[];
};

/**
 * The fields the client list actually renders.
 *
 * Every prop a server component passes to a client component is serialized into
 * the page, so sending a field the client never reads is pure page weight. The
 * list shows a title and a URL, never a summary or a date — so those stay on the
 * server. Vercel's guide calls this rule `server-serialization`.
 * https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#passing-props-from-server-to-client-components
 */
export type InsightsClientLink = Pick<
  InsightsLink,
  "id" | "urlKey" | "category" | "topics" | "url" | "title"
> & { addedAt: number };

/** Keep only the fields above, so a link's summary never reaches the browser. */
export function toClientLinks(
  linkData: Record<string, InsightsLink[]>
): Record<string, InsightsClientLink[]> {
  return Object.fromEntries(
    Object.entries(linkData).map(([category, links]) => [
      category,
      links.map(
        ({ id, urlKey, category: linkCategory, topics, url, title, addedAt }) => ({
          id,
          urlKey,
          category: linkCategory,
          topics,
          url,
          title,
          addedAt: addedAt.getTime(),
        })
      ),
    ])
  );
}

/**
 * The collection, read from Postgres (Discord is intake-only). Grouped by
 * category now — the AI's call, not the Discord channel the link happened to
 * be dropped in. The shape keeps parity with the Discord-era grouping so the
 * list, feeds and tabs work unchanged; ids stay Discord snowflakes for Redis
 * like keys and snowflake-based sorting.
 *
 * Feeds and any surface that quotes a link get the model-written summary when
 * one exists — it reads far better than a five-year-old og blurb.
 */
export async function getInsightsData(): Promise<{
  groups: InsightsGroup[];
  linkData: Record<string, InsightsLink[]>;
}> {
  const rows = await getLinks();

  // Keep every labeled category present, even when empty — parity with the
  // Discord-era tab bar.
  const groups: InsightsGroup[] = CATEGORY_ORDER.map((name) => ({
    id: name,
    name,
  }));
  const linkData: Record<string, InsightsLink[]> = Object.fromEntries(
    CATEGORY_ORDER.map((name) => [name, [] as InsightsLink[]])
  );

  for (const row of rows) {
    // A row with no category was never readable (a canvas app, a page behind a
    // bot wall) — it has no summary or passages worth showing, so it stays off
    // the public collection rather than posing as "Other".
    const bucket = row.category && isCategory(row.category) ? row.category : null;
    if (!bucket) continue;
    linkData[bucket].push({
      id: row.discordId ?? row.urlKey,
      urlKey: row.urlKey,
      category: bucket,
      topics: row.topics ?? [],
      url: row.url,
      title: row.title || "Untitled",
      description: row.summary || row.description,
      visible: true,
      addedAt: row.addedAt,
    });
  }

  return { groups, linkData };
}
