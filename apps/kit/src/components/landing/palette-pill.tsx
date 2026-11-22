"use client";

import { useRef, type PointerEvent } from "react";
import { HUES } from "@/lib/highlight-palette";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** How far the pointer's pull reaches, in px. */
const REACH = 40;
/** The most a dot grows, at the pointer's centre. */
const LIFT = 0.38;

/**
 * The palette itself, as the page's mark. A fragment of the product's own
 * chrome at the top of the page, like a toolbar on a blank document — not a
 * logo, not a hero illustration.
 *
 * The dots answer the pointer: each one grows by how close the cursor is, with
 * a falloff, so moving across the pill sends a small wave through the row the
 * way a hand moves over the swatches. One transform per dot, smoothed by CSS;
 * nothing runs on its own, and it is inert under reduced motion.
 */
export function PalettePill() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const paint = (clientX: number | null) => {
    const root = ref.current;
    if (!root) return;
    for (const dot of Array.from(root.children) as HTMLElement[]) {
      if (clientX === null) {
        dot.style.transform = "";
        continue;
      }
      // scale is around the centre, so a scaled dot's centre never moves and
      // the reading can't feed back into itself.
      const rect = dot.getBoundingClientRect();
      const distance = Math.abs(clientX - (rect.left + rect.width / 2));
      const near = Math.max(0, 1 - distance / REACH);
      dot.style.transform = near > 0 ? `scale(${(1 + near * LIFT).toFixed(3)})` : "";
    }
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    paint(event.clientX);
  };

  return (
    <div
      ref={ref}
      className="palette-pill"
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerLeave={() => {
        if (reduce) return;
        paint(null);
      }}
    >
      {HUES.map((hue) => (
        <span key={hue.name} style={{ background: hue.swatch }} />
      ))}
    </div>
  );
}
