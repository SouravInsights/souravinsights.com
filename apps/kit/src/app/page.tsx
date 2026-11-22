import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { PalettePill } from "@/components/landing/palette-pill";
import { InstallCard } from "@/components/landing/install-card";
import { Demo } from "@/components/landing/demo";
import { GalleryMarquee } from "@/components/landing/gallery-marquee";

export const metadata: Metadata = {
  title: "Highlight & Quote — mark a line, keep it as a card",
  description:
    "A copy-paste kit for highlighting text and turning the sentence into a designed quote card. Radix, Tailwind, shadcn CLI.",
};

const REPO = "https://github.com/SouravInsights/souravinsights.com";

export default function Page() {
  return (
    <div className="landing">
      <main className="doc">
        <header className="head">
          <PalettePill />
          <h1>Highlight &amp; Quote</h1>
          <p className="lede">Mark a sentence on any page. Turn it into a designed quote card.</p>
          <InstallCard />
        </header>

        <Demo />

        <GalleryMarquee />

        <footer className="foot">
          <div className="foot-brand">
            <span className="foot-mark">Highlight &amp; Quote</span>
            <span className="foot-meta">
              a shadcn kit by <a href="https://souravinsights.com">souravinsights.com</a>
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
        </footer>
      </main>
    </div>
  );
}
