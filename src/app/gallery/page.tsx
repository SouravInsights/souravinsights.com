export const revalidate = 300;

import type { Metadata } from "next";
import redis from "@/app/lib/redis";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";
import { galleryProjects, galleryVideos } from "./gallery-data";
import { GalleryGrid } from "./components/GalleryGrid";
import { GalleryCountBadge } from "./components/GalleryCountBadge";

export const metadata: Metadata = {
  title: "Gallery | SouravInsights",
  description:
    "Recordings of the interfaces and interactions I build for my side projects — micro-interactions, editors, empty states and the small moments that decide how software feels.",
  openGraph: {
    title: "Gallery | SouravInsights",
    description:
      "Recordings of the interfaces and interactions I build for my side projects.",
    type: "website",
    url: "https://www.souravinsights.com/gallery",
  },
};

/** Redis hashes come back as strings; normalize and drop anything unusable. */
const toCounts = (raw: Record<string, number> | null): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw ?? {})) {
    counts[id] = Number(value) || 0;
  }
  return counts;
};

export default async function GalleryPage() {
  // Likes and views are independent reads, so they go out together.
  const [rawLikes, rawViews] = await Promise.all([
    redis.hgetall<Record<string, number>>("gallery:likes"),
    redis.hgetall<Record<string, number>>("gallery:views"),
  ]);

  const likeCounts = toCounts(rawLikes);
  const viewCounts = toCounts(rawViews);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gallery | SouravInsights",
    description:
      "Recordings of the interfaces and interactions I build for my side projects.",
    url: "https://www.souravinsights.com/gallery",
    author: { "@type": "Person", name: "SouravInsights" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: galleryVideos.map((video, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: video.title,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-6 sm:pt-8">
        <FadeIn y={20} duration={0.3}>
          <PageHeader
            title="Gallery"
            description="Short recordings of the interfaces and interactions I build for my side projects: the motion, the states, and the small moments that decide how software feels."
            action={<GalleryCountBadge total={galleryVideos.length} />}
          />
        </FadeIn>

        <div className="mt-8">
          <GalleryGrid
            videos={galleryVideos}
            projects={galleryProjects}
            likeCounts={likeCounts}
            viewCounts={viewCounts}
          />
        </div>
      </div>
    </div>
  );
}
