"use client";

import { HUES, paint } from "@/lib/highlight-palette";

export function HighlightPaletteDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {HUES.map((hue, index) => {
        const p = paint(index, false);
        return (
          <span
            key={hue.name}
            className="rounded-[0.22em] px-2 py-1 text-sm"
            style={{ background: p.wash, color: p.ink }}
          >
            {hue.name}
          </span>
        );
      })}
    </div>
  );
}
