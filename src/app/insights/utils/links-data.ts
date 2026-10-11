import { getLinks } from "@/lib/links/queries";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./categories";
import type { DiscordChannel, LinkData } from "./discordApi";

export type InsightsLink = LinkData & {
  addedAt: Date;
  urlKey: string;
  category: string;
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
  channels: DiscordChannel[];
  linkData: Record<string, InsightsLink[]>;
}> {
  const rows = await getLinks();

  // Keep every labeled category present, even when empty — parity with the
  // Discord-era tab bar.
  const channels: DiscordChannel[] = CATEGORY_ORDER.map((name) => ({
    id: name,
    name,
  }));
  const linkData: Record<string, InsightsLink[]> = Object.fromEntries(
    CATEGORY_ORDER.map((name) => [name, [] as InsightsLink[]])
  );

  for (const row of rows) {
    const bucket = row.category && row.category in CATEGORY_LABELS
      ? row.category
      : "other";
    linkData[bucket].push({
      id: row.discordId ?? row.urlKey,
      urlKey: row.urlKey,
      category: bucket,
      url: row.url,
      title: row.title || "Untitled",
      description: row.summary || row.description,
      visible: true,
      addedAt: row.addedAt,
    });
  }

  return { channels, linkData };
}
