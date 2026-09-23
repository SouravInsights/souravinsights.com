import { unstable_cache } from "next/cache";
import {
  extractDescription,
  extractTitle,
  extractUrl,
  getChannels,
  getMessagesFromChannel,
  type LinkData,
} from "./discordApi";

/**
 * Discord is the slow part of every view of this collection, so the data is
 * cached for five minutes and every channel is fetched in parallel. Shared by
 * the page, the RSS feed, and the agent-facing markdown files.
 */
export const getDiscordData = unstable_cache(
  async () => {
    const channels = await getChannels();

    const entries = await Promise.all(
      channels.map(async (channel): Promise<[string, LinkData[]]> => {
        const messages = await getMessagesFromChannel(channel.id);
        return [
          channel.name,
          messages.map((msg) => ({
            id: msg.id,
            url: extractUrl(msg.content, msg.embeds),
            title: extractTitle(msg.embeds),
            description: extractDescription(msg.embeds),
            visible: true,
          })),
        ];
      })
    );

    return { channels, linkData: Object.fromEntries(entries) };
  },
  ["insights-discord-data-v2"],
  { revalidate: 300 }
);