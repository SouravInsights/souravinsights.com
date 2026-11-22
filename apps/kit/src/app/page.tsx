import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { PalettePill } from "@/components/landing/palette-pill";
import { InstallCard } from "@/components/landing/install-card";
import { MarkDemo } from "@/components/landing/mark-demo";
import { CardDemo } from "@/components/landing/card-demo";
import { StudioDemo } from "@/components/landing/studio-demo";

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
          <p className="lede">
            Mark text on any page, then turn the sentence into a designed quote card.
          </p>
          <InstallCard />
        </header>

        <section>
          <p className="note">Select a sentence in the passage below. The palette follows.</p>
          <MarkDemo />
        </section>

        <section>
          <p className="note">One sentence, in the design you choose.</p>
          <CardDemo />
        </section>

        <section>
          <p className="note">The studio: layouts, colours, export. The real dialog.</p>
          <StudioDemo />
        </section>

        <footer className="foot">
          <Link href="/docs">Docs</Link>
          <Link href="/docs/components/highlight">Highlight</Link>
          <Link href="/docs/components/quote-share-dialog">Studio</Link>
          <a href={REPO} rel="noreferrer">
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
