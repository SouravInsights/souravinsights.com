"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HUES } from "./hues";

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

/** The rail's height, and the tick thickness the ends sit on. */
const RAIL = 200;
const END = 2;

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
  const [hot, setHot] = useState<number | null>(null);

  if (ticks.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[4] w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Highlights: ${ticks.length}. Open Notes`}
              aria-expanded={open}
              className="group pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg py-4 pl-3 pr-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="relative block w-3.5" style={{ height: RAIL }}>
                <span
                  aria-hidden="true"
                  className="absolute right-0 h-0.5 w-3.5 rounded-full bg-faint-foreground opacity-55 transition-opacity duration-150 group-hover:opacity-80"
                  style={{ top: 0 }}
                />
                {ticks.map((tick) => (
                  <Tooltip key={tick.id}>
                    <TooltipTrigger asChild>
                      <span
                        aria-label={tick.quote}
                        onPointerEnter={() => setHot(tick.id)}
                        onPointerLeave={() => setHot(null)}
                        onClick={(event) => {
                          event.stopPropagation();
                          onJump(tick.id);
                        }}
                        style={{
                          top: tick.at * (RAIL - END),
                          backgroundColor: HUES[tick.hue]?.swatch ?? "#f4e58a",
                          scale: hot === tick.id ? "1.6 1" : "1 1",
                        }}
                        className="absolute right-0 h-0.5 w-3.5 origin-right rounded-full transition-[opacity,scale] duration-150"
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={12}
                      className="max-w-[18rem] text-[12px] leading-snug"
                    >
                      {tick.quote}
                    </TooltipContent>
                  </Tooltip>
                ))}
                <span
                  aria-hidden="true"
                  className="absolute right-0 h-0.5 w-3.5 rounded-full bg-faint-foreground opacity-55 transition-opacity duration-150 group-hover:opacity-80"
                  style={{ top: RAIL - END }}
                />
              </span>
            </button>
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
                <button
                  type="button"
                  onClick={onOpenNotebook}
                  className="transition-colors hover:text-foreground"
                >
                  Open Notes
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-1 [scrollbar-width:none]">
              {ticks.map((tick) => (
                <li
                  key={tick.id}
                  onPointerEnter={() => setHot(tick.id)}
                  onPointerLeave={() => setHot(null)}
                >
                  <button
                    type="button"
                    onClick={() => onJump(tick.id)}
                    className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-foreground/5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-3 w-0.5 shrink-0 rounded-full"
                      style={{ backgroundColor: HUES[tick.hue]?.swatch }}
                    />
                    <span className="text-[13px] leading-[1.5] text-foreground">
                      {tick.quote}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
