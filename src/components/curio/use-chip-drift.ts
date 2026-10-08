"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Pixels per second a chip row drifts. Slow enough to read and to click. */
const DRIFT_PX_PER_SEC = 30;

/**
 * Drift a chip row sideways while leaving it scrollable by hand.
 *
 * A translate-based marquee cannot do both: it clones its children and clips the
 * overflow, so there is nothing for a wheel or a drag to move. Nudging a native
 * scroll container each frame gives the same drift, keeps the browser's own
 * scrolling, and leaves the chips as real buttons.
 *
 * Two end behaviours, because the two surfaces want different things:
 * - `wrap: false` — the panel's single row reverses at each end. A row that
 *   vanishes off one edge and reappears at the other, under the eye of somebody
 *   reading it, is worse than one that changes its mind.
 * - `wrap: true` — the page's rows loop. The caller renders the chips twice, so
 *   the content repeats every half of the scroll width and shifting by exactly
 *   that much is invisible: the drift never stops and never reverses, which is
 *   the effect Perplexity's rows have.
 */
export function useChipDrift(
  ref: RefObject<HTMLDivElement | null>,
  {
    playing,
    direction = 1,
    wrap = false,
  }: { playing: boolean; direction?: 1 | -1; wrap?: boolean }
) {
  // Pausing tears this effect down and rebuilds it, so anything with a side
  // effect in its body happens again on every hover-out. Two things must not:
  // where the row was placed — re-applying that teleported the middle lane's
  // chips by half a row, which is a layout jump, not a pause — and which way a
  // reversed row was heading, which must survive the pause as well.
  // `placedRef` is keyed to the row, so a swapped row still gets placed.
  const placedRef = useRef<HTMLDivElement | null>(null);
  const dirRef = useRef<1 | -1>(direction);

  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);

  useEffect(() => {
    const row = ref.current;
    if (!row || !playing) return;

    if (placedRef.current !== row) {
      placedRef.current = row;
      // A row drifting left needs room to move before its first wrap, and one
      // set of chips is exactly the room it needs.
      if (wrap && dirRef.current < 0) row.scrollLeft = row.scrollWidth / 2;
    }

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const elapsed = now - last;
      last = now;

      const max = row.scrollWidth - row.clientWidth;
      if (max > 0) {
        row.scrollLeft += (DRIFT_PX_PER_SEC * elapsed * dirRef.current) / 1000;

        if (wrap) {
          const set = row.scrollWidth / 2;
          if (row.scrollLeft >= set) row.scrollLeft -= set;
          else if (row.scrollLeft <= 0) row.scrollLeft += set;
        } else if (row.scrollLeft >= max) {
          dirRef.current = -1;
        } else if (row.scrollLeft <= 0) {
          dirRef.current = 1;
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ref, playing, direction, wrap]);
}
