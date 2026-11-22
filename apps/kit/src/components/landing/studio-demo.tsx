"use client";

import { QuoteStudio } from "@/components/quote/studio";

/**
 * The actual studio, inline.
 *
 * No re-composition: `QuoteStudio` is the component the dialog wraps. The
 * frame is the only chrome; the panel, rail, colours, options and export are
 * the real ones. The words come from the passage above.
 */
export function StudioDemo({ quote }: { quote: string }) {
  return (
    <div className="studio-frame">
      <QuoteStudio
        quote={quote}
        title="Disappearing interfaces"
        publication="souravinsights.com"
        context=""
        band={360}
        shortcuts={false}
      />
    </div>
  );
}
