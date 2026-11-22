"use client";

import { useEffect, useRef, useState } from "react";
import { Highlight } from "@/components/highlight/highlight";
import { ShareQuoteDialog } from "@/components/quote/dialog";

const EMPTY: [] = [];
const noop = () => undefined;
const localWrite = async () => null;

export function HighlightDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [share, setShare] = useState<{ quote: string; context: string } | null>(
    null
  );
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-prose text-[15px] leading-7"
    >
      <p>
        The best interfaces disappear. You stop noticing the buttons and the
        panels and the type, and you are left with the thing you came to do.
      </p>
      <p className="mt-4">
        Select any sentence here. The palette opens on the words, and the
        highlight stays for as long as the page is open.
      </p>

      {ready && (
        <Highlight
          containerRef={containerRef}
          editable
          initialMarks={EMPTY}
          onCreate={localWrite}
          onRecolor={noop}
          onDelete={noop}
          onShareQuote={(payload) => setShare(payload)}
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
    </div>
  );
}
