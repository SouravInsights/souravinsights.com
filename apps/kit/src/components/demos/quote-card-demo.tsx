"use client";

import { QuoteCard, type QuoteContent } from "@/components/quote/quote-card";
import { THEMES } from "@/components/quote/themes";

const content: QuoteContent = {
  quote: "The best interfaces disappear.",
  title: "Disappearing interfaces",
  publication: "souravinsights.com",
  context: "",
};

export function QuoteCardDemo() {
  const theme = THEMES[0];

  return (
    <QuoteCard
      mode="post"
      theme={theme}
      variant={theme.variants[0]}
      content={content}
      className="rounded-xl"
      style={{ width: 224, height: 280 }}
    />
  );
}
