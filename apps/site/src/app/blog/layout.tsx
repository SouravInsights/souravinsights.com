import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const TITLE = "Notes & Essays";
const DESC =
  "Interactive tutorials, stories, deep dives on startups, movies, human behavior, and whatever random thing I’m curious about at 2 AM 🦉";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://souravinsights.com/blog",
    type: "website",
    images: [
      {
        url: "/blog-page-og-image.jpg",
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/blog-page-og-image.jpg"],
  },
};

const PostHogPageView = dynamic(() => import("@/components/PostHogPageView"), {
  ssr: false,
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <PHProvider>
        <PostHogPageView />
        {children}
      </PHProvider>
    </div>
  );
}
