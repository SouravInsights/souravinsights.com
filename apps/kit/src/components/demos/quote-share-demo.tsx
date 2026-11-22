"use client";

import { QuoteShare } from "@/components/blocks/quote-share";

export function QuoteShareDemo() {
  return (
    <div>
      <QuoteShare
        quote="The best interfaces disappear. You stop noticing the buttons and the panels and the type, and you are left with the thing you came to do."
        title="Disappearing interfaces"
        publication="souravinsights.com"
      />
    </div>
  );
}
