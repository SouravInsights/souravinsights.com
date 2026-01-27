import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const DESCRIPTION = `Explore my reading journey: see what I'm reading now, what's next,
  and the books I've finished!`;
const TITLE = "My Reading Lists";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://souravinsights.com",
    type: "website",
    images: [
      {
        url: "/books-page-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "My Books Page Preview Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/books-page-og-image.jpg"],
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
