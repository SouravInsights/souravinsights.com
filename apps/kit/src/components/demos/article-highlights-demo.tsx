"use client";

import { ArticleHighlights } from "@/components/blocks/article-highlights";

export function ArticleHighlightsDemo() {
  return (
    <div className="w-full max-w-prose text-[15px] leading-7">
      <ArticleHighlights
        title="Disappearing interfaces"
        publication="souravinsights.com"
      >
        <p>
          The best interfaces disappear. You stop noticing the buttons and the
          panels and the type, and you are left with the thing you came to do.
        </p>
        <p className="mt-4">
          Select any sentence. A tick appears on the rail, and the palette
          offers a colour and a share.
        </p>
      </ArticleHighlights>
    </div>
  );
}
