import React from "react";
import {
  getChannels,
  getMessagesFromChannel,
  LinkData,
  extractUrl,
  extractTitle,
} from "./utils/discordApi";
import CuratedLinksTabs from "@/app/curated-links/components/CuratedLinks";

async function getDiscordData() {
  const channels = await getChannels();
  const linkData: { [key: string]: LinkData[] } = {};

  for (const channel of channels) {
    const messages = await getMessagesFromChannel(channel.id);
    linkData[channel.name] = messages.map((msg) => ({
      id: msg.id,
      url: extractUrl(msg.content),
      title: extractTitle(msg.content),
      visible: true,
    }));
  }

  return { channels, linkData };
}

export default async function CuratedLinksPage() {
  const { channels, linkData } = await getDiscordData();
  console.log("channels:", channels);
  console.log("linkData:", linkData);
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-green-800">
          My Digital Garden
        </h1>
        <p className="text-center text-gray-600 mb-12">
          A curated collection of inspiring links and resources
        </p>
        <CuratedLinksTabs channels={channels} linkData={linkData} />
      </div>
    </div>
  );
}
