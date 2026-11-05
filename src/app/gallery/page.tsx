import type { Metadata } from "next";
import { GalleryClient } from "./components/GalleryClient";

const DESCRIPTION =
  "Short recordings of the interfaces and interactions I build for my side projects: the motion, the states, and the small moments that decide how software feels.";

const OG_IMAGE = {
  url: "/gallery-page-og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Gallery — recordings of the interfaces I build",
};

export const metadata: Metadata = {
  title: "Gallery | SouravInsights",
  description: DESCRIPTION,
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery | SouravInsights",
    description: DESCRIPTION,
    type: "website",
    url: "https://www.souravinsights.com/gallery",
    siteName: "Sourav Insights",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery | SouravInsights",
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

/**
 * The page is a shell. The clips arrive from `GET /api/gallery` on the client
 * (see `GalleryClient`), so this stays static and the browser makes one request
 * for the whole grid.
 */
export default function GalleryPage() {
  return <GalleryClient />;
}
