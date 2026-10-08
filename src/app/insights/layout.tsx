import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

/**
 * The route's fallback metadata. The page sets its own title, description and OG
 * block, so what actually renders from here is the OG image and the Twitter
 * card — kept in step with the page anyway, because a duplicate that says
 * something different is a trap for whoever edits this next.
 */
const DESCRIPTION = `A constantly updating collection of links I find worth keeping — articles, tools, portfolios — and Curio, the agent that answers from them.`;

export const metadata: Metadata = {
  title: "Insights — My Digital Garden | SouravInsights",
  description: DESCRIPTION,
  openGraph: {
    title: "Insights — My Digital Garden",
    description: DESCRIPTION,
    url: "https://souravinsights.com/insights",
    type: "website",
    images: [
      {
        url: "/curated-page-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "My Digital Garden Preview Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Insights — My Digital Garden",
    description: DESCRIPTION,
    images: ["/curated-page-og-image.jpg"],
  },
};

const PostHogPageView = dynamic(() => import("@/components/PostHogPageView"), {
  ssr: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen transition-colors duration-200">
      <PHProvider>
        <PostHogPageView />
        {children}
      </PHProvider>
    </div>
  );
}
