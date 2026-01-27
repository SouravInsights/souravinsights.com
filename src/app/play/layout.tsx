import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const DESCRIPTION =
  "Play interactive games like the Language Muncher Snake Game. Gobble up programming languages and grow your tech stack in this fun, educational twist on the classic Snake game.";

export const metadata: Metadata = {
  title: "Play - Interactive Games & Experiences",
  description: DESCRIPTION,
  openGraph: {
    title: "Play - Interactive Games & Experiences",
    description: DESCRIPTION,
    url: "https://souravinsights.com/play",
    type: "website",
    images: [
      {
        url: "/snake-game-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Play Page Preview Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Play - Interactive Games & Experiences",
    description: DESCRIPTION,
    images: ["/snake-game-og-image.jpg"],
  },
};

const PostHogPageView = dynamic(() => import("@/components/PostHogPageView"), {
  ssr: false,
});

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-background dark:to-background dark:bg-background transition-colors duration-200">
      <PHProvider>
        <PostHogPageView />
        <div className="pt-12 md:pt-28 pb-12">{children}</div>
      </PHProvider>
    </div>
  );
}
