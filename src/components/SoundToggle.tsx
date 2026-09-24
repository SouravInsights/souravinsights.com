"use client";

import { useCallback, useRef } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CircularSlider } from "@/components/ui/circular-slider";
import { useSoundSettings } from "@/context/SoundContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useHaptics } from "@/hooks/useHaptics";
import { useUISound } from "@/hooks/useUISound";

/**
 * Volume, as a single rotary dial.
 *
 * The dial is the entire control: turned to zero it is silent, so an on/off
 * switch would only restate it. It gives a haptic detent on every step, so it
 * feels like a physical knob. Dragging stays silent (a drag is a high-frequency
 * interaction); the one soft click lands when the value is committed.
 */
export function SoundToggle() {
  const { volume, setVolume } = useSoundSettings();
  const haptics = useHaptics();
  const sound = useUISound();
  const moved = useRef(false);

  // The pill is centred on narrow screens, so the trigger isn't a useful
  // anchor there — the panel would hang off to one side.
  const isNarrow = useMediaQuery("(max-width: 767px)");

  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleChange = (next: number) => {
    // A tap on the current value is a no-op — it shouldn't get a commit click.
    if (next === volume) return;
    moved.current = true;
    setVolume(next);
  };

  // The dial reports detents rather than every change, so a continuous drag
  // ticks once per 10% instead of buzzing on every pixel.
  const handleDetent = useCallback(() => haptics.select(), [haptics]);

  const handleCommit = () => {
    if (moved.current) sound.playSwitch();
    moved.current = false;
  };

  return (
    <Popover>
      {isNarrow && (
        <PopoverAnchor asChild>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0"
          />
        </PopoverAnchor>
      )}

      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Volume"
          className="flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent"
        >
          <Icon size={16} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={isNarrow ? "center" : "end"}
        sideOffset={isNarrow ? 10 : 16}
        collisionPadding={12}
        className="w-fit rounded-lg p-0.5"
      >
        <CircularSlider
          value={volume}
          onChange={handleChange}
          onDetent={handleDetent}
          onCommit={handleCommit}
          label="Volume"
        />
      </PopoverContent>
    </Popover>
  );
}
