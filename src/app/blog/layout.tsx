import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Sourav's Blog",
  description:
    "Sharing my thoughts, learnings, and experiences on web development, design, and more.",
  openGraph: {
    title: "Sourav's Blog",
    description:
      "Sharing my thoughts, learnings, and experiences on web development, design, and more.",
    url: "https://souravinsights.com/blog",
    type: "website",
    images: [
      {
        url: "/blog-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sourav's Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sourav's Blog",
    description:
      "Sharing my thoughts, learnings, and experiences on web development, design, and more.",
    images: ["/blog-og-image.jpg"],
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <PHProvider>
        <PostHogPageView />
        <div className="max-w-7xl mx-auto px-4 pt-12 md:pt-28 pb-12 sm:px-6 lg:px-8">
          {children}
        </div>
      </PHProvider>
    </div>
  );
}
