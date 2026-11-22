"use client";

import { useState } from "react";
import { QuoteCard, type QuoteContent } from "@/components/quote/quote-card";
import { THEMES } from "@/components/quote/themes";
import { Swatch, SwatchGroup } from "@/components/ui/swatch";

const CONTENT: QuoteContent = {
  quote: "The best interfaces disappear.",
  title: "Disappearing interfaces",
  publication: "souravinsights.com",
  context: "",
};

/**
 * One sentence, and the design row. Clicking a swatch re-renders the real
 * `QuoteCard` — the same renderer the PNG export uses, and the same swatch
 * component the studio uses. The row is a preview of the product's range.
 */
export function CardDemo() {
  const [id, setId] = useState(THEMES[0].id);
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];

  return (
    <>
      <div className="themes">
        <SwatchGroup value={id} onValueChange={setId} aria-label="Design">
          {THEMES.map((t) => (
            <Swatch
              key={t.id}
              value={t.id}
              background={t.variants[0].swatch}
              label={t.name}
              variant="scale"
            />
          ))}
        </SwatchGroup>
      </div>

      <div className="card">
        <QuoteCard
          mode="post"
          theme={theme}
          variant={theme.variants[0]}
          content={CONTENT}
          style={{ width: "100%", aspectRatio: "4 / 5" }}
        />
      </div>

      <p className="caption">{theme.name}</p>
    </>
  );
}
