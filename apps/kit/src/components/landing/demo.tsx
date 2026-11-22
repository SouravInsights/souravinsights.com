"use client";

import { useRef, useState } from "react";
import { MarkDemo } from "./mark-demo";
import { StudioDemo } from "./studio-demo";

/**
 * The passage and the studio, sharing one quote.
 *
 * Share quote in the palette does not open a dialog: it sets the studio's
 * words and brings the studio into view. The visitor marks a line in the
 * article and lands in the studio with it — one tool, not two demos.
 */
export function Demo() {
  const [quote, setQuote] = useState("The best interfaces disappear.");
  const studioRef = useRef<HTMLElement>(null);

  const share = (payload: { quote: string; context: string }) => {
    setQuote(payload.quote);
    window.requestAnimationFrame(() => {
      studioRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  return (
    <>
      <section>
        <MarkDemo onShare={share} />
      </section>

      <section ref={studioRef}>
        <header className="section-head">
          <h2 className="section-title">The studio</h2>
          <p>Choose a format, tune the palette, edit the words, save the image.</p>
        </header>
        <StudioDemo quote={quote} />
      </section>
    </>
  );
}
