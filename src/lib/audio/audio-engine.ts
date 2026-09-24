/**
 * A single shared AudioContext for the whole site.
 *
 * Browsers only allow audio to begin from a user gesture, so the context is
 * created lazily on the first interaction and resumed if the browser suspended
 * it. Everything else asks this module for the context instead of building its
 * own — one context is all a page needs.
 */

let audioCtx: AudioContext | null = null;
let isInitialized = false;

/**
 * Initializes or resumes the shared AudioContext.
 * MUST be called as a direct result of a user interaction (click, touch,
 * keydown) to comply with browser autoplay policies.
 */
export async function initAudioEngine(): Promise<AudioContext> {
  if (!audioCtx) {
    // Fallback for older Safari browsers.
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  // If the context is suspended (browser policy), resume it.
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  isInitialized = true;
  return audioCtx;
}

/** The active AudioContext, or null if it hasn't been initialized yet. */
export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

/** Whether the engine is ready to play sounds. */
export function isAudioEngineReady(): boolean {
  return isInitialized && audioCtx?.state === "running";
}
