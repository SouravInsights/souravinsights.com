"use client";

import { useEffect, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { Highlight } from "@/components/highlight/highlight";
import { copyPassageLink } from "../utils/passage";

/** The studio is the heaviest part and only opens on demand. */
const ShareQuoteDialog = dynamic(
  () => import("@/components/quote/dialog").then((m) => m.ShareQuoteDialog),
  { ssr: false },
);

/**
 * The reader's highlight palette on the blog.
 *
 * Same engine the insights reader uses — a selection snaps to words, a hue
 * paints a mark, and the palette's Share quote tool opens the card studio.
 * Blog posts have no highlight table behind them, so a mark lives for the
 * visit: it is a way to quote the article, not a personal notebook.
 */
export default function BlogHighlights({
  containerRef,
  title,
}: {
  containerRef: RefObject<HTMLElement | null>;
  title: string;
}) {
  const [share, setShare] = useState<{
    quote: string;
    context: string;
  } | null>(null);
  const [studio, setStudio] = useState(false);
  // The engine wraps paragraph text in spans. The blog's markdown is server-
  // rendered, so it must not touch that DOM until React has hydrated it.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <>
      {ready && (
        <Highlight
          containerRef={containerRef}
          editable
          initialMarks={EMPTY}
          onCreate={localWrite}
          onRecolor={noop}
          onDelete={noop}
          onShareQuote={(payload) => {
            setShare(payload);
            setStudio(true);
          }}
          onCopyLink={copyPassageLink}
        />
      )}
      {studio && (
        <ShareQuoteDialog
          open={share !== null}
          onOpenChange={(open) => {
            if (!open) setShare(null);
          }}
          quote={share?.quote ?? ""}
          context={share?.context ?? ""}
          title={title}
          publication="souravinsights.com"
        />
      )}
    </>
  );
}

const EMPTY: [] = [];
const noop = () => undefined;
const localWrite = async () => null;
