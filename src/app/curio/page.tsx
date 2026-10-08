import type { Metadata, Viewport } from "next";
import { CurioHome } from "@/components/curio/CurioHome";
import { getSuggestions } from "@/lib/kb/suggestions";

/**
 * Curio's own page — the agent with the whole screen instead of a card.
 *
 * `viewportFit: cover` lets the composer sit in the safe area on a phone rather
 * than above a black bar. `interactiveWidget: resizes-content` makes the layout
 * shrink with the on-screen keyboard instead of letting the browser push the
 * whole page up, which is the difference between a chat app and a web form.
 *
 * Deliberately *not* `maximumScale: 1` (unlike the game screen): pinch-zoom is
 * how somebody with low vision reads an answer, and there is no dribbling here
 * to protect from a double tap.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Curio | Ask my collection",
  description:
    "Curio answers questions from my curated collection of links — articles, tools and portfolios I saved. Answers cite the pages they came from, and only those.",
  alternates: {
    types: {
      "application/rss+xml": "/insights/rss.xml",
    },
  },
  openGraph: {
    title: "Curio | Ask my collection",
    description:
      "An agent that answers from my curated collection of links, citing the pages it used and nothing else.",
    type: "website",
    url: "https://www.souravinsights.com/curio",
  },
};

export default function CurioPage() {
  // Chips come from the collection itself (scripts/kb-suggestions.ts), not from
  // a hand-written list that drifts into title-echoes.
  const suggestions = getSuggestions();

  return <CurioHome suggestions={suggestions} />;
}
