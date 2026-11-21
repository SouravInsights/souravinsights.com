"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HUES } from "@/lib/highlight-palette";
import { MarkerRail } from "@/components/ui/marker-rail";

/**
 * The highlight map: a small rail pinned to the article's right edge that shows
 * where the highlights are, without moving as the article scrolls.
 *
 *  - the rail is a fixed 14px wide, its height is a constant (200px), and the
 *    ticks are placed at the highlight's fraction down the article;
 *  - the two `end` ticks (2px, dimmed) mark the rail's own top and bottom;
 *  - a highlight tick is 2px, `transform-origin: 100%`, and widens to 1.6× on
 *    hover;
 *  - the whole rail is one button that opens a popover listing the highlights,
 *    with a way into Notes.
 *
 * It takes plain data and renders nothing else, so the reader can portal it
 * outside the scroller (which is what makes it sticky) while the highlight
 * engine keeps owning the marks.
 */

export interface HighlightTick {
  /** the mark's row id, and the `data-hl` value on the marked span */
  id: number;
  /** 0..1 down the article */
  at: number;
  hue: number;
  quote: string;
}

export function HighlightTicks({
  ticks,
  onJump,
  onOpenNotebook,
}: {
  ticks: HighlightTick[];
  onJump: (id: number) => void;
  onOpenNotebook?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (ticks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-[4] w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="pointer-events-auto">
            <MarkerRail
              markers={ticks.map((tick) => ({
                id: tick.id,
                at: tick.at,
                color: HUES[tick.hue]?.swatch ?? "#f4e58a",
                label: tick.quote,
              }))}
              onSelect={onJump}
              ariaLabel={`Highlights: ${ticks.length}. Open Notes`}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            />
          </div>
        </PopoverTrigger>

          <PopoverContent
            side="left"
            align="center"
            sideOffset={14}
            className="w-80 overflow-hidden p-0"
          >
            <div className="flex items-center justify-between px-4 py-2.5 text-[12px] font-medium text-muted-foreground">
              <span>
                {ticks.length} Highlight{ticks.length === 1 ? "" : "s"}
              </span>
              {onOpenNotebook && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenNotebook}
                  className="h-auto p-0 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  Open Notes
                </Button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-1 [scrollbar-width:none]">
              {ticks.map((tick) => (
                <li key={tick.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onJump(tick.id)}
                    className="flex h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-md px-2.5 py-2 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-3 w-0.5 shrink-0 rounded-full"
                      style={{ backgroundColor: HUES[tick.hue]?.swatch }}
                    />
                    <span className="text-[13px] leading-[1.5] text-foreground">
                      {tick.quote}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
    </div>
  );
}
