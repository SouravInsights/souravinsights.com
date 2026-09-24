"use client";

import { useMemo } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import { useUISound } from "@/hooks/useUISound";

/**
 * The site's feedback layer: every meaningful interaction answers on the
 * senses it deserves.
 *
 * The two channels are deliberately not equal:
 *
 * - **Haptics** are silent and cheap, so they fire broadly — every tap, link,
 *   and key.
 * - **Sound** is louder in every sense, so it is rationed to actions that
 *   actually carry weight: a state the user changed on purpose, a reward, a
 *   milestone, a refusal. Navigation is not a confirmation, and toggles are not
 *   purchases, so those get a short switch rather than a fanfare.
 */
export function useFeedback() {
  const haptics = useHaptics();
  const sound = useUISound();

  return useMemo(
    () => ({
      /**
       * A state the user changed on purpose: a toggle, a segment, a filter, a
       * sort. Low weight, so it earns a short switch and a tick.
       */
      select: () => {
        haptics.select();
        sound.playSwitch();
      },
      /**
       * Navigation and generic presses. Touch only — sound here would fire on
       * nearly every tap, and a link is not an event worth announcing.
       */
      press: () => {
        haptics.press();
      },
      /** Liking something. A small reward, so it gets a pop. */
      like: (pitch = 1) => {
        haptics.press();
        sound.playPop(1, pitch);
      },
      /** A milestone reached — the one place a chime is warranted. */
      success: () => {
        haptics.success();
        sound.playSuccess();
      },
      /** An action was blocked. Inform, don't punish. */
      warning: () => {
        haptics.warning();
        sound.playDeny();
      },
    }),
    [haptics, sound]
  );
}
