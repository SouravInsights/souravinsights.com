"use client";

import { useState } from "react";
import { QuoteCarousel } from "@/components/quote/carousel";
import { THEMES } from "@/components/quote/themes";

const content = {
  quote: "The best interfaces disappear.",
  title: "Disappearing interfaces",
  publication: "souravinsights.com",
  context: "",
};

export function QuoteCarouselDemo() {
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const band = 280;
  const frameWidth = Math.round(band * (1080 / 1350));

  return (
    <QuoteCarousel
      themes={THEMES}
      themeId={themeId}
      onThemeChange={setThemeId}
      mode="post"
      band={band}
      frameWidth={frameWidth}
      frameHeight={band}
      content={content}
      variantByTheme={{}}
      overridesByTheme={{}}
    />
  );
}
