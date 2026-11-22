"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HUES } from "@/lib/highlight-palette";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The palette as the footer's rule.
 *
 * The header opens on the palette pill; the page closes on the same eight hues
 * stretched into a hairline, so the product's one bit of colour brackets the
 * whole document. Same source as the pill, so the two can never drift.
 *
 * The rule draws itself when the footer first comes into view — one left-to-
 * right wipe on `clip-path`, the way the highlighter lays a mark down, and then
 * it never moves again. No loop, no shimmer. Off entirely under reduced motion.
 */
export function PaletteRule() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  // Armed before paint, so the rule never flashes at full width first.
  useLayoutEffect(() => {
    if (!reduce) setArmed(true);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !armed) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed, reduce]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-armed={armed ? "" : undefined}
      data-shown={shown ? "" : undefined}
      className="foot-palette"
    >
      {HUES.map((hue) => (
        <span key={hue.name} style={{ background: hue.swatch }} />
      ))}
    </div>
  );
}
