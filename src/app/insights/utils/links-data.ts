import { getLinks } from "@/lib/links/queries";
import { resolveCategory } from "@/lib/kb/categories";
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
    // A row classified before taxonomy v2 ("blog", "portfolio"…) lands in its
    // v2 home. A row with NO category was never readable (a canvas app, a page
    // behind a bot wall) — it has no summary or passages worth showing, so it
    // stays off the public collection rather than posing as "Other".
    const bucket = resolveCategory(row.category);
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
