"use client";

import { useEffect, useRef, useState } from "react";
import { Highlight } from "@/components/highlight/highlight";
import { ShareQuoteDialog } from "@/components/quote/dialog";

const EMPTY: [] = [];
const noop = () => undefined;
const localWrite = async () => null;

const PASSAGE = [
  "The best interfaces disappear. You stop noticing the buttons, the panels, the type — and you are left with the thing you came to do.",
  "A line you underlined is worth keeping. Paint it, keep it, and when it deserves an audience, turn it into a card.",
];

/** A passage the engine actually runs on: select a sentence, the palette opens. */
export function MarkDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [share, setShare] = useState<{ quote: string; context: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return (
    <>
      <div ref={containerRef} className="passage">
        {PASSAGE.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      {ready && (
        <Highlight
          containerRef={containerRef}
          editable
          initialMarks={EMPTY}
          onCreate={localWrite}
          onRecolor={noop}
          onDelete={noop}
          onShareQuote={setShare}
        />
      )}

      {share && (
        <ShareQuoteDialog
          open={share !== null}
          onOpenChange={(open) => {
            if (!open) setShare(null);
          }}
          quote={share.quote}
          context={share.context}
          title="Disappearing interfaces"
          publication="souravinsights.com"
        />
      )}
    </>
  );
}
