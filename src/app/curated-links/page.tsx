export const revalidate = 60; // Revalidate every minute

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
import { NewsletterSignup } from "./components/NewsletterSignup";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Links | SouravInsights",
  description:
    "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, career opportunities, and must-read articles curated from my Discord community.",
  openGraph: {
    title: "Curated Links | My Digital Garden",
    description:
      "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, career opportunities, and must-read articles.",
    type: "website",
    url: "https://www.souravinsights.com/curated-links",
  },
};

async function getDiscordData() {
  const channels = await getChannels();
  const linkData: { [key: string]: LinkData[] } = {};

  for (const channel of channels) {
    const messages = await getMessagesFromChannel(channel.id);
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Curated Links | My Digital Garden",
    description: "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, career opportunities, and must-read articles.",
    url: "https://www.souravinsights.com/curated-links",
    author: {
      "@type": "Person",
      name: "SouravInsights",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: channels.map((channel, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: channel.name,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-2 md:p-8 transition-colors duration-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 sm:mb-4 text-green-800 dark:text-green-400 transition-colors duration-200">
        My Digital Garden
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-4 sm:mb-8 transition-colors duration-200">
        A curated collection of useful links and resources
      </p>

      <div className="max-w-2xl mx-auto mb-8">
        <NewsletterSignup />
      </div>

      <CuratedLinksTabs channels={channels} linkData={linkData} />
    </div>
  );
}
