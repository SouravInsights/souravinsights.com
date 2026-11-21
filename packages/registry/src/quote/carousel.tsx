"use client";

import * as React from "react";
import {
  SnapCarousel,
  SnapCarouselContent,
  SnapCarouselItem,
} from "@/components/ui/snap-carousel";
import type { Mode } from "./presets";
import type { Overrides } from "./render";
import type { ShareTheme } from "./themes";
import { QuoteCard, type QuoteContent } from "./quote-card";

const NO_OVERRIDES: Overrides = {};

const GAP = 29;

export interface QuoteCarouselProps {
  themes: readonly ShareTheme[];
  themeId: string;
  onThemeChange: (id: string) => void;
  mode: Mode;
  band: number;
  frameWidth: number;
  frameHeight: number;
  content: QuoteContent;
  variantByTheme: Record<string, number>;
  overridesByTheme: Record<string, Overrides>;
}

/** The design rail: cards in a spring carousel, one active design. */
function QuoteCarousel({
  themes,
  themeId,
  onThemeChange,
  mode,
  band,
  frameWidth,
  frameHeight,
  content,
  variantByTheme,
  overridesByTheme,
}: QuoteCarouselProps) {
  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);
  const lastScroll = React.useRef(0);

  return (
    <SnapCarousel
      items={themes.map((theme) => theme.id)}
      value={themeId}
      onValueChange={onThemeChange}
      gap={GAP}
      recenterKey={`${mode}-${frameWidth}`}
    >
      <SnapCarouselContent
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Styles"
        onScroll={() => {
          lastScroll.current = performance.now();
        }}
        style={{
          marginTop: GAP - 12,
          height: band + 40,
          paddingTop: 12,
          paddingBottom: 28,
          paddingInline: `calc(50% - ${frameWidth / 2}px)`,
        }}
        className="no-scrollbar relative flex items-center overflow-x-auto overflow-y-hidden outline-none [overscroll-behavior-x:contain]"
      >
        {themes.map((theme, index) => {
          const active = themeId === theme.id;
          return (
            <SnapCarouselItem
              key={theme.id}
              value={theme.id}
              aria-label={theme.name}
              style={{ width: frameWidth, height: frameHeight }}
              onPointerDown={(event) =>
                (pointerStart.current = {
                  x: event.clientX,
                  y: event.clientY,
                })
              }
              onClick={(event) => {
                const start = pointerStart.current;
                const still =
                  !start ||
                  Math.hypot(
                    event.clientX - start.x,
                    event.clientY - start.y
                  ) < 4;
                const recent = performance.now() - lastScroll.current < 150;
                if (active || !still || recent) return;
                onThemeChange(theme.id);
              }}
              className="group cursor-pointer"
            >
              <div className="relative h-full w-full overflow-hidden rounded-md shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] group-data-[peek=on]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-6px_rgba(0,0,0,0.14)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.1)] dark:group-data-[peek=on]:shadow-[0_0_0_0.5px_rgba(255,255,255,0.1),0_10px_28px_-6px_rgba(0,0,0,0.6)]">
                <QuoteCard
                  mode={mode}
                  theme={theme}
                  variant={
                    theme.variants[variantByTheme[theme.id] ?? 0] ??
                    theme.variants[0]
                  }
                  overrides={overridesByTheme[theme.id] ?? NO_OVERRIDES}
                  content={content}
                  style={{ width: frameWidth, height: frameHeight }}
                  className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            </SnapCarouselItem>
          );
        })}
      </SnapCarouselContent>
    </SnapCarousel>
  );
}

export { QuoteCarousel };
