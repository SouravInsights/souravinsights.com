"use client";

import { useEffect, useRef, useState } from "react";
import { Highlight, type HighlightMark } from "@/components/highlight/highlight";

const noop = () => undefined;
const localWrite = async () => null;

const PASSAGE = [
  "The best interfaces disappear. You stop noticing the buttons, the panels, the type. All that's left is what you came to do.",
  "You notice a tool only when it fights you: a spinner that won't end, a button that moves, a menu that closes early. The rest of the time it should stay out of the way.",
];

// The opening line arrives already marked, so the visitor sees the result
// before they know how to make one.
const OPENING: HighlightMark = {
  id: 1,
  quote: "The best interfaces disappear.",
  occurrence: 0,
  hue: 2,
};

/**
 * A passage the engine actually runs on.
 *
 * The opening line is pre-marked; clicking it opens the palette, and selecting
 * any other text adds a mark. No caption sits above it: the marked sentence is
 * the demo, and the affordance for changing it has to come from the sentence.
 */
export function MarkDemo({
  onShare,
}: {
  onShare: (payload: { quote: string; context: string }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
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
          initialMarks={[OPENING]}
          onCreate={localWrite}
          onRecolor={noop}
          onDelete={noop}
          onShareQuote={onShare}
        />
      )}
    </>
  );
}
