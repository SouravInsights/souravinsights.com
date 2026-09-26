"use client";

import { useCallback, useMemo } from "react";
import {
  getAudioContext,
  initAudioEngine,
  isAudioEngineReady,
} from "@/lib/audio/audio-engine";
import { useSoundSettings } from "@/context/SoundContext";
import {
  createDenySound,
  createGameOverSound,
  createPopSound,
  createSuccessSound,
  createSweepSound,
  createSwitchSound,
  createThudSound,
} from "@/lib/audio/sound-profiles";

type Synth = (
  ctx: AudioContext,
  t: number,
  volMult: number,
  pitch: number
) => void;

/**
 * Semantic sound effects.
 *
 * Honours the sound settings: nothing plays while sound is off, and every
 * sound is scaled by the user's volume. Prefer {@link useFeedback}, which pairs
 * these with haptics and encodes how much weight each action deserves.
 */
export function useUISound() {
  const { volume } = useSoundSettings();

  /**
   * A safe wrapper that makes sure the AudioContext is unlocked and that the
   * dial isn't at zero.
   *
   * If the context isn't ready — the user hasn't interacted with the page — we
   * unlock it and play once it resumes. That only works because this is called
   * from a user gesture. Audio must never crash the app, so failures are
   * swallowed.
   */
  const playSound = useCallback(
    (synth: Synth, volMult = 1, pitch = 1) => {
      if (volume <= 0) return;

      const level = volMult * volume;

      if (!isAudioEngineReady()) {
        initAudioEngine()
          .then((ctx) => synth(ctx, ctx.currentTime, level, pitch))
          .catch((error) => {
            console.warn("Failed to unlock audio context:", error);
          });
        return;
      }

      const ctx = getAudioContext();
      if (ctx && ctx.state === "running") {
        synth(ctx, ctx.currentTime, level, pitch);
      }
    },
    [volume]
  );

  const playSwitch = useCallback(
    (volMult = 1) => playSound(createSwitchSound, volMult),
    [playSound]
  );
  const playPop = useCallback(
    (volMult = 1, pitch = 1) => playSound(createPopSound, volMult, pitch),
    [playSound]
  );
  const playSuccess = useCallback(
    (volMult = 1) => playSound(createSuccessSound, volMult),
    [playSound]
  );
  const playDeny = useCallback(
    (volMult = 1) => playSound(createDenySound, volMult),
    [playSound]
  );
  const playGameOver = useCallback(
    (volMult = 1) => playSound(createGameOverSound, volMult),
    [playSound]
  );
  const playThud = useCallback(
    (volMult = 1) => playSound(createThudSound, volMult),
    [playSound]
  );
  const playSweep = useCallback(
    (volMult = 1) => playSound(createSweepSound, volMult),
    [playSound]
  );

  // Stable identity so callers can safely depend on it.
  return useMemo(
    () => ({
      /** A state change the user made on purpose — toggle, filter, segment. */
      playSwitch,
      /** A small reward. `pitch` scales it, so a run of likes can climb. */
      playPop,
      /** A milestone. */
      playSuccess,
      /** A refusal, kept gentle. */
      playDeny,
      /** An ending. */
      playGameOver,
      /** A landing impact — quiet enough to fire on every piece lock. */
      playThud,
      /** A clearance shimmer, for rows leaving the board. */
      playSweep,
      /** Exposed so a global first-interaction listener can unlock audio early. */
      initAudio: initAudioEngine,
    }),
    [playSwitch, playPop, playSuccess, playDeny, playGameOver, playThud, playSweep]
  );
}
