import React from "react";
import { Metadata } from "next";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const DESCRIPTION =
  "A running list of books worth reading: what I'm reading now, what's next, and everything I've finished.";
const TITLE = "My Reading Lists";

const OG_IMAGE = {
  url: "/books-page-og-image.jpg",
  width: 1200,
  height: 630,
  alt: "My Library page, with covers of the books I'm reading",
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/books" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.souravinsights.com/books",
    siteName: "Sourav Insights",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
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
