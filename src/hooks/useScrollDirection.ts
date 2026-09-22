"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which way the page is scrolling. Used to get the fixed navbar out of
 * the way on the way down so a sticky sub-bar (the Insights tabs) can take the
 * top edge, then bring it back the moment the user scrolls up.
 */
export function useScrollDirection(): "up" | "down" {
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      // Ignore tiny jitters so the bar doesn't flicker.
      if (Math.abs(delta) > 6) {
        setDirection(delta > 0 ? "down" : "up");
        lastY = y;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
}