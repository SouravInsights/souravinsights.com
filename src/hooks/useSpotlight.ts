"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

const SPOTLIGHT_TRANSITION =
  "transition-[filter,opacity,background-color] duration-300";
const SPOTLIGHT_DIM = "blur-[1px] opacity-40";
const SPOTLIGHT_SHARP = "blur-0 opacity-100";

/**
 * Shared class string for a spotlightable item. Kept next to the hook so the
 * blur strength lives in one place.
 */
export function spotlightClass(dimmed: boolean): string {
  return `${SPOTLIGHT_TRANSITION} ${dimmed ? SPOTLIGHT_DIM : SPOTLIGHT_SHARP}`;
}

interface UseSpotlightOptions {
  /** When true, clicking an item pins the spotlight until it's clicked again. */
  pinnable?: boolean;
}

/**
 * Tracks which item in a group is focused so every other item can blur/dim.
 * Hover (or keyboard focus) previews; when `pinnable`, a click holds the
 * selection and clicking the same item — or the container via `clear` —
 * releases it.
 *
 * Spread `getItemProps(index)` onto each item and use `spotlightClass(isDimmed(index))`
 * for its className, so the behaviour stays identical across shelves.
 */
export function useSpotlight({ pinnable = false }: UseSpotlightOptions = {}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const active = hovered ?? pinned;
  const isDimmed = (index: number) => active !== null && active !== index;

  const getItemProps = (index: number) => ({
    onMouseEnter: () => setHovered(index),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(index),
    onBlur: () => setHovered(null),
    ...(pinnable
      ? {
          onClick: (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            setPinned((current) => (current === index ? null : index));
          },
        }
      : {}),
  });

  const clear = () => setPinned(null);

  return { active, isDimmed, getItemProps, clear };
}
