/*
 * The shared highlight palette.
 *
 * Reader mode and blog passage links both mark text, so they paint from one
 * set of hues: a mark should mean the same thing on either surface. Ported
 * from github.com/SanyamPunia/www components/labs/highlight-wave (notes.ts),
 * with honest dark-mode counterparts for its ink/wash pairs.
 */

export interface Hue {
  name: string;
  /** the swatch, and the glow a passing wave throws */
  swatch: string;
  /** the text once it is marked (light mode, 5.5:1 on its own wash) */
  ink: string;
  /** the bar behind the text, the swatch at low alpha over the page */
  wash: string;
}

/** `#rrggbb` at an alpha, since a WAAPI keyframe cannot take a `color-mix()` */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
}

/** `#rrggbb` mixed toward white — dark mode's readable ink from the swatch. */
function lighten(hex: string, share: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * share);
  return `rgb(${mix((n >> 16) & 255)} ${mix((n >> 8) & 255)} ${mix(n & 255)})`;
}

const hue = (name: string, swatch: string, ink: string, wash: number) => ({
  name,
  swatch,
  ink,
  wash: alpha(swatch, wash),
});

/** Eight hues in wheel order, verbatim from the original. */
export const HUES: readonly Hue[] = [
  hue("red", "#f2545b", "#a3212a", 0.2),
  hue("orange", "#f7883b", "#97440b", 0.22),
  hue("amber", "#f2c230", "#7d5600", 0.3),
  hue("green", "#3cc370", "#156b37", 0.22),
  hue("cyan", "#22bfd3", "#0a6773", 0.22),
  hue("blue", "#5a72f2", "#2f43b8", 0.2),
  hue("violet", "#a463ee", "#6a2bb0", 0.2),
  hue("pink", "#ef6fb1", "#a0215f", 0.2),
];

export interface Paint {
  ink: string;
  wash: string;
}

/**
 * The ink/wash a hue paints with in the current theme. Light mode keeps the
 * original's values exactly; dark mode lightens the ink off the swatch and
 * deepens the wash, so a mark reads on dark backgrounds too.
 */
export function paint(hueIndex: number, dark: boolean): Paint {
  const h = HUES[hueIndex];
  return dark
    ? { ink: lighten(h.swatch, 0.55), wash: alpha(h.swatch, 0.34) }
    : { ink: h.ink, wash: h.wash };
}
