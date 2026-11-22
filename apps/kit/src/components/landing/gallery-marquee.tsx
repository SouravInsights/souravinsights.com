"use client";

import { useEffect, useRef, useState } from "react";
import { QuoteCard } from "@/components/quote/quote-card";
import { MODES, type Mode } from "@/components/quote/presets";
import { themeById } from "@/components/quote/themes";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { KEPT_LINES } from "./kept-lines";

/** The card height is fixed, so the band never jumps when the format changes. */
const BAND = 340;
/** Slow enough to read as it passes; px per second. */
const SPEED = 26;

/**
 * Quote cards, passing.
 *
 * One row, one format, so the only variables are the words and the design. The
 * format control is a real segmented switch: the pill slides on a spring, the
 * cards morph width on the same beat, and the rail keeps moving underneath
 * because it is driven by scrollLeft, not a CSS transform.
 */
export function GalleryMarquee() {
  const [mode, setMode] = useState<Mode>("post");
  const railRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const reduce = useReducedMotion();

  const index = MODES.findIndex((m) => m.id === mode);
  const active = MODES[index] ?? MODES[0];
  const width = Math.round((BAND * active.width) / active.height);
  // Two copies, so the rail can wrap at half its width with no seam.
  const run = [...KEPT_LINES, ...KEPT_LINES];

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || reduce) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused.current) {
        rail.scrollLeft += SPEED * dt;
        const half = rail.scrollWidth / 2;
        // modulo, not subtraction: changing format changes `half` too, and one
        // step must land in range or the rail appears to rewind.
        if (half > 0 && rail.scrollLeft >= half) rail.scrollLeft %= half;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <section>
      <header className="section-head">
        <h2 className="section-title">Quote cards</h2>
        <p>Four designs, three sizes.</p>
      </header>

      <div className="sizes" role="tablist" aria-label="Format">
        <span
          aria-hidden="true"
          className="sizes-pill"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === mode}
            data-active={m.id === mode ? "" : undefined}
            title={m.tip}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        className="rail"
        ref={railRef}
        onPointerEnter={() => {
          paused.current = true;
        }}
        onPointerLeave={() => {
          paused.current = false;
        }}
      >
        <div className="rail-track">
          {run.map((line, i) => {
            const theme = themeById(line.theme);
            return (
              <QuoteCard
                key={`${line.quote}-${i}`}
                theme={theme}
                variant={theme.variants[0]}
                mode={mode}
                content={{
                  quote: line.quote,
                  title: line.source,
                  publication: "souravinsights.com",
                  context: "",
                }}
                className="rail-card"
                style={{ height: BAND, width }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
