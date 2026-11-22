"use client";

import { useRef, useState } from "react";
import { Highlight, type HighlightMark } from "@/components/highlight/highlight";
import { Button } from "@/components/ui/button";

const TEXT =
  "The best interfaces disappear. You stop noticing the buttons and the panels and the type, and you are left with the thing you came to do.";

const MARK: HighlightMark = {
  id: 1,
  quote: "The best interfaces disappear.",
  occurrence: 0,
  hue: 2,
};

/**
 * Controlled marks: the parent owns the array, the engine only renders it.
 *
 * This is the shape to use when the marks come from somewhere else — a form, a
 * server response, a URL — rather than from a selection inside the engine.
 */
export function HighlightControlledDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<HighlightMark[]>([]);

  return (
    <div className="w-full max-w-prose">
      <div ref={containerRef} className="text-[15px] leading-7 text-foreground/85">
        <p>{TEXT}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setMarks([MARK])}>
          Mark from outside
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setMarks([])}>
          Clear
        </Button>
      </div>

      <Highlight
        containerRef={containerRef}
        editable={false}
        marks={marks}
        onMarksChange={setMarks}
        onShareQuote={() => undefined}
      />
    </div>
  );
}
