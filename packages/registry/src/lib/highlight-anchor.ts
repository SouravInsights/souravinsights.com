/*
 * Character offsets inside one paragraph, and how a new mark cuts the marks it
 * overlaps. The palette lives in `@/lib/highlight-palette`.
 */

export interface HighlightSpan {
  id: number;
  para: number;
  /** character offsets into the paragraph's string, end exclusive */
  start: number;
  end: number;
  hue: number;
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
  marks: readonly HighlightSpan[],
  para: number,
  text: string,
  start: number,
  end: number,
  nextId: () => number,
): HighlightSpan[] {
  const out: HighlightSpan[] = [];
  // a piece cut at a word boundary carries the space beside it, which goes
  const keep = (m: HighlightSpan) => {
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
