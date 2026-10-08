import React from "react";
import TetrisGame from "@/components/tetris/TetrisGame";
import { FadeIn } from "@/components/FadeIn";
import { PageHeader } from "@/components/PageHeader";
import { Metadata, Viewport } from "next";

/* App-like screen: edge-to-edge under the notch, and no double-tap zoom
   while dribbling pieces — scoped to this route only. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Shipstack",
  description:
    "Just Tetris. Fill rows, clear them, chase tetrises. Plays best on a phone.",
  openGraph: {
    title: "Shipstack",
    description:
      "Just Tetris. Fill rows, clear them, chase tetrises. Plays best on a phone.",
    url: "https://souravinsights.com/play",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shipstack",
    description:
      "Just Tetris. Fill rows, clear them, chase tetrises. Plays best on a phone.",
  },
};

const PlayPage: React.FC = () => {
  return (
    <div>
      {/* Not the shared `container`: its 2rem gutters are dead space on a
          phone, and the game deserves every pixel of the screen. From md up it
          is the site's own page rhythm — a real gutter and the page's own top
          padding — and the column is the viewport minus the tab bar's band, so
          the deck still fills what is left below the header rather than hanging
          at the top edge with nothing above it. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col px-3 md:h-[calc(100svh-var(--tabbar-space))] md:px-6 md:pt-8">
        <div className="hidden shrink-0 md:block">
          <FadeIn y={20} duration={0.3}>
            <PageHeader
              title="Shipstack"
              description="Just Tetris. Fill rows, clear them, chase tetrises."
            />
          </FadeIn>
        </div>

        <TetrisGame />

        {/* The classic lives on in src/components/SnakeGame.tsx, retired
            from the page, not from the repo. */}
      </div>
    </div>
  );
};

export default PlayPage;
