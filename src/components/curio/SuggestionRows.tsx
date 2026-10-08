"use client";

import { useRef, useState } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useChipDrift } from "./use-chip-drift";

/**
 * The suggestions as lanes of drifting chips, each lane moving the opposite way
 * to the one above it — the way Perplexity's home reads.
 *
 * Why more than one row at all: a single row shows four or five chips at a time,
 * so most of what the collection can be asked about is never seen. Three lanes
 * show three times as much without any of them becoming a wall of text.
 *
 * Why alternating: lanes all moving the same way read as one wide surface
 * sliding past, which pulls the eye sideways. Opposite neighbours read as
 * separate lanes, so the movement becomes texture rather than something to
 * follow.
 */
export function SuggestionRows({
  suggestions,
  onPick,
  disabled,
  lanes = 3,
}: {
  suggestions: string[];
  onPick: (suggestion: string) => void;
  disabled?: boolean;
  lanes?: number;
}) {
  // Dealt round-robin, so every lane stays a mix of channels instead of each
  // lane becoming one category.
  const dealt = Array.from({ length: lanes }, (_, lane) =>
    suggestions.filter((_, index) => index % lanes === lane)
  );

  return (
    <div className="flex flex-col gap-2.5">
      {dealt.map((chips, index) => (
        <ChipLane
          key={index}
          chips={chips}
          direction={index % 2 === 0 ? 1 : -1}
          onPick={onPick}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function ChipLane({
  chips,
  direction,
  onPick,
  disabled,
}: {
  chips: string[];
  direction: 1 | -1;
  onPick: (suggestion: string) => void;
  disabled?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const rowRef = useRef<HTMLDivElement>(null);

  useChipDrift(rowRef, {
    playing: !paused && !reduceMotion,
    direction,
    wrap: true,
  });

  return (
    <div
      className="suggestions-fade"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        // Only resume once focus has actually left the lane.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      {/* No gap on the scroller and the same gap as padding on each set: that
          makes the scroll width exactly two identical sets, which is the number
          the drift wraps by. An outer gap would put a few pixels of lie in every
          wrap. */}
      <div
        ref={rowRef}
        className="no-scrollbar flex flex-nowrap items-center overflow-x-auto pb-1"
      >
        {[0, 1].map((set) => (
          <div
            key={set}
            aria-hidden={set === 1}
            className="flex flex-nowrap items-center gap-2 pr-2"
          >
            {chips.map((chip) => (
              <Suggestion
                key={chip}
                suggestion={chip}
                onClick={onPick}
                disabled={disabled}
                // The second set is the same chips again — not a second set of
                // buttons to tab through.
                tabIndex={set === 1 ? -1 : undefined}
                className="type-caption shrink-0"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
