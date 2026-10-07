import { getLinks } from "@/lib/links/queries";
import { CHANNEL_LABELS, CHANNEL_ORDER } from "./channels";
import type { DiscordChannel, LinkData } from "./discordApi";

export type InsightsLink = LinkData & { addedAt: Date };

/**
 * The collection, read from Postgres (Discord is intake-only since the
 * snapshot). Same shape as the old getDiscordData so page/RSS/llms-full keep
 * working unchanged: item ids stay Discord snowflakes, which keeps Redis like
 * keys and snowflake-based sorting valid.
 */
export async function getInsightsData(): Promise<{
  channels: DiscordChannel[];
  linkData: Record<string, InsightsLink[]>;
}> {
  const rows = await getLinks();

  // Keep every labeled channel present, even when empty — parity with the
  // Discord-era tab bar.
  const channels: DiscordChannel[] = CHANNEL_ORDER.map((name) => ({
    id: name,
    name,
  }));
  const linkData: Record<string, InsightsLink[]> = Object.fromEntries(
    CHANNEL_ORDER.map((name) => [name, [] as InsightsLink[]])
  );

  for (const row of rows) {
    if (!(row.channel in CHANNEL_LABELS)) continue;
    linkData[row.channel].push({
      id: row.discordId ?? row.urlKey,
      url: row.url,
      title: row.title || "Untitled",
      description: row.description,
      visible: true,
      addedAt: row.addedAt,
    });
  }

  return { channels, linkData };
}
