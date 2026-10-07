export const revalidate = 300;

import React from "react";
import Link from "next/link";
import InsightsList from "@/app/curated-links/components/InsightsList";
import { dedupeByUrl, sortByNewestId } from "./utils/urlUtils";
import { getInsightsData } from "./utils/links-data";
import { getPreviewMap } from "@/lib/link-preview";
import redis from "@/app/lib/redis";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";
import { AskPanel } from "./components/AskPanel";
import { LinksCountBadge } from "./components/LinksCountBadge";
import { getSuggestions } from "@/lib/kb/suggestions";
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

/** The site's link treatment, with a focus ring for keyboard users. */
const linkClass =
  "font-medium text-green-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm dark:text-green-500 dark:focus-visible:ring-green-500/40";

export default async function CuratedLinksPage() {
  const { channels, linkData } = await getInsightsData();

  // Chips come from the collection itself (scripts/kb-suggestions.ts), not
  // from a hand-written list that drifts into title-echoes.
  const suggestions = getSuggestions();

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

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-6 sm:pt-24 md:pt-32">
        <FadeIn y={20} duration={0.3}>
          <PageHeader
            title="Insights"
            description="A constantly updating collection of links I find worth keeping, including articles, tools, portfolios and more."
            action={<LinksCountBadge total={totalLinks} />}
          />
        </FadeIn>

        <div className="mt-8">
          <AskPanel suggestions={suggestions} />
        </div>

        {/* The collection is a public dataset as well as a page, and this is
            where curiosity peaks: you have just watched the agent answer from
            it. The line used to sit at the very bottom of the page in the
            faintest text tier, below ~490 links, where nobody found it. */}
        <p className="type-caption mt-4">
          All of this is queryable from outside the site, over{" "}
          <Link href="/api/docs" className={linkClass}>
            HTTP
          </Link>{" "}
          or from your editor with{" "}
          <Link href="/docs#mcp" className={linkClass}>
            MCP
          </Link>
          .{" "}
          <Link href="/docs" className={linkClass}>
            Using the Collection
          </Link>{" "}
          has the rest.
        </p>

        {/* Browse is a separate mode from Ask, so it gets its own heading and a
            wider gap than the step above it. Otherwise the two blocks read as
            one, and the panel's edge touches the list's toolbar. */}
        <div className="mt-16">
          <SectionHeader title="Browse the collection" />
          <InsightsList
            channels={channels}
            linkData={linkData}
            previews={previews}
            likeCounts={likeCounts}
            shuffleSeed={shuffleSeed}
          />
        </div>
      </div>
    </div>
  );
}