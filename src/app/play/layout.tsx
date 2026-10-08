import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const DESCRIPTION =
  "Play Shipstack. Just Tetris. Fill rows, clear them, chase tetrises.";

export const metadata: Metadata = {
  title: "Play - Interactive Games & Experiences",
  description: DESCRIPTION,
  openGraph: {
    title: "Play - Interactive Games & Experiences",
    description: DESCRIPTION,
    url: "https://souravinsights.com/play",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Play - Interactive Games & Experiences",
    description: DESCRIPTION,
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
    <div className="transition-colors duration-200">
      <PHProvider>
        <PostHogPageView />
        {/* No min-height here. The shell already gives the page its height, and
            100dvh *inside* the panel overshot the tab bar's band by exactly
            --tabbar-space, which pushed the control deck under the bar on a
            phone. .play-root still subtracts that band from its own box. */}
        {children}
      </PHProvider>
    </div>
  );
}
