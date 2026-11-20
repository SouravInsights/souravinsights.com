/*
 * The reader's mark math: character offsets inside one paragraph, and how a
 * new mark cuts the marks it overlaps. The palette itself is shared with the
 * blog and lives in `@/lib/highlight-palette`.
 */

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
