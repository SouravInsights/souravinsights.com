import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const DESCRIPTION = `Explore a curated collection of useful links and resources. 
This page is an extension of myself and will house all of my curations, all of the resources, 
links that I personally have discovered from various sources!`;

export const metadata: Metadata = {
  title: "My Digital Garden - Curated Links by SouravInsights",
  description: DESCRIPTION,
  openGraph: {
    title: "My Digital Garden - Curated Links",
    description: DESCRIPTION,
    url: "https://souravinsights.com",
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
    title: "My Digital Garden - Curated Links",
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
        <div className="pt-12 md:pt-28 pb-12">{children}</div>
      </PHProvider>
    </div>
  );
}
