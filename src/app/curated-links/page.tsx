import React from "react";
import {
  getChannels,
  getMessagesFromChannel,
  LinkData,
  extractUrl,
  extractTitle,
  extractDescription,
} from "./utils/discordApi";
import CuratedLinksTabs from "@/app/curated-links/components/CuratedLinksTabs";

async function getDiscordData() {
  const channels = await getChannels();
  const linkData: { [key: string]: LinkData[] } = {};

  for (const channel of channels) {
    const messages = await getMessagesFromChannel(channel.id);
    messages.forEach((msg) => console.log("msg:", msg));
    linkData[channel.name] = messages.map((msg) => ({
      id: msg.id,
      url: extractUrl(msg.content, msg.embeds),
      title: extractTitle(msg.embeds),
      description: extractDescription(msg.embeds),
      visible: true,
    }));
  }

  return { channels, linkData };
}

export default async function CuratedLinksPage() {
  const { channels, linkData } = await getDiscordData();
  // console.log("channels:", channels);
  // console.log("linkData:", linkData);
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-2 md:p-8 transition-colors duration-200">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 sm:mb-4 text-green-800 dark:text-green-400 transition-colors duration-200">
        My Digital Garden
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-4 sm:mb-8 transition-colors duration-200">
        A curated collection of useful links and resources
      </p>
      <CuratedLinksTabs channels={channels} linkData={linkData} />
    </div>
  );
}
