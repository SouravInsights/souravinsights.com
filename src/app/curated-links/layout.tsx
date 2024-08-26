import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Digital Garden - Curated Links by SouravInsights",
  description:
    "Explore a curated collection of useful links and resources by souravinsights. Discover valuable content on My Digital Garden.",
  openGraph: {
    title: "My Digital Garden - Curated Links",
    description:
      "Explore a curated collection of useful links and resources by souravinsights. Discover valuable content on My Digital Garden.",
    url: "https://souravinsights.com",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "My Digital Garden Preview Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Digital Garden - Curated Links",
    description:
      "Explore a curated collection of useful links and resources by souravinsights. Discover valuable content on My Digital Garden.",
    images: ["/opengraph-image.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      {children}
    </div>
  );
}
