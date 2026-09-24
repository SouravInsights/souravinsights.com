"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SoundContextType = {
  /** Volume, 0–1. Zero is muted — there is no separate on/off flag. */
  volume: number;
  setVolume: (value: number) => void;
};

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY = "sound";
const DEFAULT_VOLUME = 0.7;

/**
 * `prefers-reduced-motion` is the accepted proxy for sound sensitivity, so it
 * decides the default for anyone who hasn't chosen yet.
 */
function systemPrefersQuiet() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Volume is the whole preference. A dial turned to zero is silence, so a
 * separate on/off switch would only ever restate what the dial already says.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (stored && typeof stored.volume === "number") {
        // Older builds stored an `enabled` flag alongside the volume.
        setVolumeState(stored.enabled === false ? 0 : stored.volume);
        return;
      }
    } catch {
      // Corrupt storage: fall through to the system default.
    }
    setVolumeState(systemPrefersQuiet() ? 0 : DEFAULT_VOLUME);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: clamped }));
    } catch {
      // Storage can be unavailable (private mode); the session still works.
    }
  }, []);

  return (
    <SoundContext.Provider value={{ volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error("useSoundSettings must be used within a SoundProvider");
  }
  return context;
}
