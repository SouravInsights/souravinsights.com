import type { Metadata } from "next";
import { GalleryClient } from "./components/GalleryClient";

export const metadata: Metadata = {
  title: "Gallery | SouravInsights",
  description:
    "Recordings of the interfaces and interactions I build for my side projects — micro-interactions, editors, empty states and the small moments that decide how software feels.",
  openGraph: {
    title: "Gallery | SouravInsights",
    description:
      "Recordings of the interfaces and interactions I build for my side projects.",
    type: "website",
    url: "https://www.souravinsights.com/gallery",
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
