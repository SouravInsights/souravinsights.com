export const revalidate = 300;

import React from "react";
import InsightsList from "@/app/curated-links/components/InsightsList";
import { dedupeByUrl, sortByNewestId } from "./utils/urlUtils";
import { getDiscordData } from "./utils/discord-data";
import { getPreviewMap } from "@/lib/link-preview";
import redis from "@/app/lib/redis";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights | SouravInsights",
  description:
    "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, and must-read articles curated from my Discord community.",
  alternates: {
    types: {
      "application/rss+xml": "/curated-links/rss.xml",
    },
  },
  openGraph: {
    title: "Insights | My Digital Garden",
    description:
      "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, and must-read articles.",
    type: "website",
    url: "https://www.souravinsights.com/curated-links",
  },
};

export default async function CuratedLinksPage() {
  const { channels, linkData } = await getDiscordData();

  // Screenshots are captured out of band and cached in Blob; resolving them
  // here means a hover just points at a stored, immutable image.
  const previews = await getPreviewMap(
    Object.values(linkData)
      .flat()
      .map((link) => link.url)
      .filter(Boolean)
  );

  // Like totals for the whole collection, so the list can sort by quality
  // without a request per link.
  const rawLikes = await redis.hgetall<Record<string, number>>(
    "insights:likes"
  );
  const likeCounts: Record<string, number> = {};
  for (const [id, count] of Object.entries(rawLikes ?? {})) {
    likeCounts[id] = Number(count) || 0;
  }

  // Grand total across every channel, de-duplicated, so the header can show
  // how much is in the collection without any per-view noise.
  const totalLinks = dedupeByUrl(
    sortByNewestId(channels.flatMap((channel) => linkData[channel.name] || []))
  ).length;

  // A new shuffle every five minutes, handed down so the server and client
  // agree on the order.
  const shuffleSeed = Math.floor(Date.now() / (5 * 60 * 1000));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Insights | My Digital Garden",
    description:
      "A constantly updating digital garden of design inspiration, dev tools, portfolios, newsletters, and must-read articles.",
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
    <div className="min-h-screen bg-background transition-colors duration-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-32">
        <FadeIn y={20} duration={0.5}>
          <PageHeader
            title="Insights"
            description="A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more."
            action={
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 type-caption tabular-nums">
                <span className="font-medium text-foreground">
                  {totalLinks.toLocaleString()}
                </span>
                <span className="text-faint-foreground">links</span>
              </span>
            }
          />
        </FadeIn>

        <InsightsList
          channels={channels}
          linkData={linkData}
          previews={previews}
          likeCounts={likeCounts}
          shuffleSeed={shuffleSeed}
        />
      </div>
    </div>
  );
}