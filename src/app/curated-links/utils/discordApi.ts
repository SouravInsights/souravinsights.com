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
}

export interface DiscordChannel {
  id: string;
  name: string;
}

export interface LinkData {
  id: string;
  url: string;
  title: string;
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
    return channels.filter(
      (channel) =>
        channel.name.startsWith("fav-") ||
        ["design-inspo", "mint-worthy", "product-hunt"].includes(channel.name)
    );
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

export function extractUrl(content: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = content.match(urlRegex);
  return match ? match[0] : "";
}

export function extractTitle(content: string): string {
  return content.split("\n")[0] || "Untitled";
}
