import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error("Missing Discord environment variables");
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

export interface DiscordMessage {
  id: string;
  content: string;
  channel_id: string;
  embeds: any[];
}

export interface DiscordChannel {
  id: string;
  name: string;
}

export interface LinkData {
  id: string;
  url: string;
  title: string;
  description?: string;
  visible: boolean;
}

export async function getChannels(): Promise<DiscordChannel[]> {
  if (!GUILD_ID) {
    console.error("GUILD_ID is not defined");
    return [];
  }

  try {
    const channels = (await rest.get(
      Routes.guildChannels(GUILD_ID)
    )) as DiscordChannel[];

    const desiredChannels = [
      "fav-portfolios",
      "design-inspo",
      "mint-worthy",
      "product-hunt",
      "reading-list",
      "newsletters",
      "opportunities",
    ];

    return channels.filter((channel) => desiredChannels.includes(channel.name));
  } catch (error) {
    console.error("Error fetching channels:", error);
    return [];
  }
}

export async function getMessagesFromChannel(
  channelId: string
): Promise<DiscordMessage[]> {
  try {
    const messages = (await rest.get(Routes.channelMessages(channelId), {
      query: new URLSearchParams({ limit: "100" }),
    })) as DiscordMessage[];
    return messages.filter((message) => message.content.includes("http"));
  } catch (error) {
    console.error(`Error fetching messages from channel ${channelId}:`, error);
    return [];
  }
}

export function extractUrl(content: string, embeds: any[]): string {
  // If there's an embed with a URL, return that
  if (embeds && embeds.length > 0 && embeds[0].url) {
    return embeds[0].url;
  }
  // Fallback to extracting from content
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = content.match(urlRegex);
  return match ? match[0] : "";
}

export function extractTitle(embeds: any[]): string {
  // If there's an embed with a title, return that
  if (embeds && embeds.length > 0 && embeds[0].title) {
    return embeds[0].title;
  }
  // Fallback title if no embeds present
  return "Untitled";
}

export function extractDescription(embeds: any[]): string {
  // If there's an embed with a description, return that
  if (embeds && embeds.length > 0 && embeds[0].description) {
    return embeds[0].description;
  }
  // Fallback description if no embeds present
  return "No description available";
}
