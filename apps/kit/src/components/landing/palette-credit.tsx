"use client";

import { useEffect, useRef, useState } from "react";
import { HUES, paint } from "@/lib/highlight-palette";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** How long each hue holds before the next one fades in. */
const HOLD = 2600;

/**
 * The footer's credit, marked.
 *
 * It takes hue 2's real ink and wash from highlight-palette — the same paint
 * the reader and the blog use — and walks the mark through the palette, one
 * hue every 2.6s, so the credit is a live demo of the thing the kit does. The
 * colour change is a slow crossfade on `background-color`/`color`; the mark
 * itself never moves, so nothing flickers or grabs.
 *
 * No Highlight component and no palette UI: it is a mark, not an editor.
 * Under reduced motion it stays on amber and never cycles.
 */
export function PaletteCredit() {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const [hue, setHue] = useState(2);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setHue((n) => (n + 1) % HUES.length), HOLD);
    return () => window.clearInterval(id);
  }, [reduce]);

  // Paint straight onto the element so the transition runs on the property
  // itself rather than through an unregistered custom property.
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const dark = document.documentElement.classList.contains("dark");
    const { ink, wash } = paint(hue, dark);
    el.style.background = wash;
    el.style.color = ink;
  }, [hue, reduce]);

  return (
    <a ref={ref} className="foot-credit" href="https://souravinsights.com">
      souravinsights.com
    </a>
  );
}
