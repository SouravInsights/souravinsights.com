"use client";

import { useState } from "react";
import type { MouseEvent } from "react";

const SPOTLIGHT_DIM = "blur-[1px] opacity-40";
const SPOTLIGHT_SHARP = "blur-0 opacity-100";
const SPOTLIGHT_TRANSITION = "transition-[filter,opacity] duration-300";

interface SpotlightClassOptions {
  /**
   * Fade the blur. Use on dense grids: a single row dims one thing, but a
   * grid dims many cells at once, and an instant change there reads as a
   * flash. Single-row lists stay instant.
   */
  smooth?: boolean;
}

/**
 * Shared class string for a spotlightable item. Kept next to the hook so the
 * blur strength lives in one place.
 *
 * Instant by default: the dim is a pure function of the pointer position. A
 * transition makes the blur lag behind a fast pointer, so rows stay blurry
 * while the cursor is already on the next one. Pass `smooth` for dense grids,
 * where the same instant change is a flash.
 */
export function spotlightClass(
  dimmed: boolean,
  { smooth = false }: SpotlightClassOptions = {}
): string {
  const dim = dimmed ? SPOTLIGHT_DIM : SPOTLIGHT_SHARP;
  return smooth ? `${SPOTLIGHT_TRANSITION} ${dim}` : dim;
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
