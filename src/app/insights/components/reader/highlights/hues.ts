/*
 * The palette and the pure helpers of the highlight system — ported from
 * github.com/SanyamPunia/www components/labs/highlight-wave (notes.ts),
 * generalized over paragraphs the article owns instead of a fixed notes list,
 * and given honest dark-mode counterparts for its ink/wash pairs.
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

export interface Highlight {
  id: number;
  para: number;
  /** character offsets into the paragraph's string, end exclusive */
  start: number;
  end: number;
  hue: number;
}

/** the article-side identity of a mark: where it lives and what it says */
export interface LocatedMark extends Highlight {
  quote: string;
}

export interface Segment {
  text: string;
  mark: Highlight | null;
}

/** a paragraph cut at its marks, in reading order */
export function segments(text: string, marks: readonly Highlight[]): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of [...marks].sort((a, b) => a.start - b.start)) {
    if (m.start > at) out.push({ text: text.slice(at, m.start), mark: null });
    out.push({ text: text.slice(m.start, m.end), mark: m });
    at = m.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: null });
  return out;
}

/**
 * A selection grown out to whole words and trimmed of the space at either end.
 * Half a word marked is never what a hand dragging across prose meant.
 */
export function snap(text: string, start: number, end: number): [number, number] {
  let s = start;
  let e = end;
  while (s > 0 && !/\s/.test(text[s - 1])) s--;
  while (e < text.length && !/\s/.test(text[e])) e++;
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  return [s, e];
}

/**
 * The marks left once a new one is laid over `[start, end)`. A mark the new one
 * overlaps keeps whatever part of it is outside, which can be a piece either
 * side.
 */
export function cut(
  marks: readonly Highlight[],
  para: number,
  text: string,
  start: number,
  end: number,
  nextId: () => number
): Highlight[] {
  const out: Highlight[] = [];
  // a piece cut at a word boundary carries the space beside it, which goes
  const keep = (m: Highlight) => {
    let { start: s, end: e } = m;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e > s) out.push({ ...m, start: s, end: e });
  };
  for (const m of marks) {
    if (m.para !== para || m.end <= start || m.start >= end) {
      out.push(m);
      continue;
    }
    if (m.start < start) keep({ ...m, end: start });
    if (m.end > end) keep({ ...m, id: nextId(), start: end });
  }
  return out;
}
