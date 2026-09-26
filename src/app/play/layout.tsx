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
    <div className="min-h-screen transition-colors duration-200">
      <PHProvider>
        <PostHogPageView />
        <div className="pt-16 md:pt-20">{children}</div>
      </PHProvider>
    </div>
  );
}
