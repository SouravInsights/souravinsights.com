"use client";

import { useRef, useState, type ReactNode } from "react";
import { Highlight, type CreatePayload } from "@/components/highlight/highlight";
import {
  HighlightRail,
  type HighlightRailItem,
} from "@/components/highlight/highlight-rail";
import { ShareQuoteDialog } from "@/components/quote/dialog";

export interface ArticleHighlightsProps {
  title: string;
  publication: string;
  children: ReactNode;
}

/** Article body + palette + rail + share dialog, wired with local marks. */
export function ArticleHighlights({
  title,
  publication,
  children,
}: ArticleHighlightsProps) {
  const articleRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState([]);
  const [ticks, setTicks] = useState<HighlightRailItem[]>([]);
  const [share, setShare] = useState<{ quote: string; context: string } | null>(
    null
  );
  const nextId = useRef(1);

  const create = async (payload: CreatePayload) => {
    const id = nextId.current++;
    setMarks((all) => [...all, { id, ...payload }]);
    return id;
  };

  return (
    <>
      <div ref={articleRef}>{children}</div>
      <Highlight
        containerRef={articleRef}
        initialMarks={marks}
        onCreate={create}
        onRecolor={() => undefined}
        onDelete={(id) => setMarks((all) => all.filter((mark) => mark.id !== id))}
        onShareQuote={setShare}
        onTicks={setTicks}
      />
      <HighlightRail
        ticks={ticks}
        onJump={(id) => {
          const mark = document.querySelector<HTMLElement>(`[data-hl="${id}"]`);
          mark?.scrollIntoView({ block: "center", behavior: "smooth" });
        }}
      />
      <ShareQuoteDialog
        open={share !== null}
        onOpenChange={(open) => {
          if (!open) setShare(null);
        }}
        quote={share?.quote ?? ""}
        context={share?.context ?? ""}
        title={title}
        publication={publication}
      />
    </>
  );
}
