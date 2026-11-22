import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { PaletteCredit } from "@/components/landing/palette-credit";
import { PalettePill } from "@/components/landing/palette-pill";
import { PaletteRule } from "@/components/landing/palette-rule";
import { InstallCard } from "@/components/landing/install-card";
import { Demo } from "@/components/landing/demo";
import { GalleryMarquee } from "@/components/landing/gallery-marquee";

const DESCRIPTION =
  "A shadcn kit for highlighting text. Save locally. Share as posts. Radix, Tailwind, shadcn CLI.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ui.souravinsights.com"),
  title: "Highlight & Quote — mark a line, keep it as a card",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    title: "Highlight & Quote",
    description: DESCRIPTION,
    siteName: "Highlight & Quote",
  },
  twitter: {
    card: "summary_large_image",
    title: "Highlight & Quote",
    description: DESCRIPTION,
  },
};

const REPO = "https://github.com/SouravInsights/souravinsights.com";

export default function Page() {
  return (
    <div className="landing">
      <main className="doc">
        <header className="head">
          <PalettePill />
          <h1>Highlight &amp; Quote</h1>
          <p className="lede">
            A shadcn kit for highlighting text. Save locally. Share as posts.
          </p>
          <InstallCard />
        </header>

        <Demo />

        <GalleryMarquee />

        <footer className="foot">
          <PaletteRule />
          <div className="foot-bar">
            <div className="foot-brand">
              <span className="foot-mark">Highlight &amp; Quote</span>
              <span className="foot-meta">
                a shadcn kit by <PaletteCredit />
              </span>
            </div>
            <nav aria-label="Footer" className="foot-links">
              <Link href="/docs">Docs</Link>
              <Link href="/docs/components/highlight">Highlight</Link>
              <Link href="/docs/components/quote-share-dialog">Studio</Link>
              <a href={REPO} rel="noreferrer">
                GitHub
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}
