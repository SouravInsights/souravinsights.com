"use client";

import { useReducedMotion } from "framer-motion";
import { METEOCONS } from "./meteocons";
import type { WeatherSlug } from "@/lib/weather";

/**
 * The weather glyph for the deploy banner.
 *
 * Meteocons draws the animation itself (SMIL, no runtime), so this only picks
 * which file to point at. Two files exist per slug: the animated SVG, and the
 * static twin for `prefers-reduced-motion` — SMIL runs inside an `<img>` and
 * cannot be paused from the page, so honouring the preference means serving a
 * different asset rather than stopping one.
 *
 * Colours are the icon's own. These are illustrations, not interface glyphs,
 * so they are not tied to `currentColor`.
 */
export function WeatherIcon({
  slug,
  size = 16,
  className,
  alt = "",
}: {
  slug: WeatherSlug;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const reduce = useReducedMotion();
  const icon = METEOCONS[slug];

  // `next/image` is skipped on purpose: there is nothing to optimize, these
  // SVGs ship as-is and animate in the browser, and next/image only serves an
  // SVG under `dangerouslyAllowSVG` for no gain at 16px.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={reduce ? icon.still : icon.animated}
      width={size}
      height={size}
      className={className}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
