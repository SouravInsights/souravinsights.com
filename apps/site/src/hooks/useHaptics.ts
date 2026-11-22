"use client";

import { useMemo } from "react";
import { useWebHaptics } from "web-haptics/react";
import type { HapticPreset } from "web-haptics";

/**
 * Semantic haptic feedback for the whole site.
 *
 * The library's `selection` (8ms @ 0.3) and `light` (15ms @ 0.4) presets are
 * barely perceptible on phones, so a discrete choice gets a firmer, shorter
 * tick and everything else uses `medium`.
 */
const TICK: HapticPreset = { pattern: [{ duration: 12, intensity: 0.75 }] };

export function useHaptics() {
  const { trigger } = useWebHaptics();

  // `trigger` is stable, so callers can safely depend on this object.
  return useMemo(
    () => ({
      /** A discrete choice: segment switch, menu pick, filter. */
      select: () => void trigger(TICK),
      /** A standard press: navigation, buttons, likes. */
      press: () => void trigger("medium"),
      /** Outcomes. */
      success: () => void trigger("success"),
      error: () => void trigger("error"),
      warning: () => void trigger("warning"),
    }),
    [trigger]
  );
}