"use client";

import { useCallback, type RefObject } from "react";
import { snap } from "@/lib/highlight-anchor";

export interface TextSelection {
  para: number;
  start: number;
  end: number;
  /** measured lazily, in viewport coordinates */
  anchor: () => DOMRect | null;
}

/** One box around every line of a selection or mark. */
export function unionRect(rects: DOMRect[]): DOMRect | null {
  let l = Number.POSITIVE_INFINITY;
  let r = Number.NEGATIVE_INFINITY;
  let t = Number.POSITIVE_INFINITY;
  let b = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    if (rect.width < 1) continue;
    l = Math.min(l, rect.left);
    r = Math.max(r, rect.right);
    t = Math.min(t, rect.top);
    b = Math.max(b, rect.bottom);
  }
  if (!Number.isFinite(l)) return null;
  return new DOMRect(l, t, r - l, b - t);
}

/** characters of text in `root` before a DOM position */
function offsetIn(root: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * Read the current text selection as offsets inside the first paragraph it
 * touches. Offsets are snapped to whole words; a double-click's single word is
 * ignored while the third click is on its way to selecting the paragraph.
 */
export function useTextSelection({
  containerRef,
  paragraphs,
  wordSelect,
}: {
  containerRef: RefObject<HTMLElement | null>;
  paragraphs: RefObject<HTMLElement[]>;
  wordSelect?: RefObject<boolean>;
}) {
  return useCallback((): TextSelection | null => {
    const container = containerRef.current;
    const sel = window.getSelection();
    if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed)
      return null;
    const range = sel.getRangeAt(0);

    // The paragraph the selection touches, not one that contains both ends.
    // A drag that runs past a paragraph's end is the normal case on a phone
    // (the handle lands on the next line), and demanding both ends inside one
    // paragraph returned nothing at all for it.
    const list = paragraphs.current ?? [];
    const para = list.findIndex((p) => range.intersectsNode(p));
    const el = list[para];
    if (!el) return null;
    const text = el.textContent ?? "";

    const s = el.contains(range.startContainer)
      ? offsetIn(el, range.startContainer, range.startOffset)
      : 0;
    const e = el.contains(range.endContainer)
      ? offsetIn(el, range.endContainer, range.endOffset)
      : text.length;
    const [start, end] = snap(text, Math.min(s, e), Math.max(s, e));
    if (end <= start) return null;

    if (wordSelect?.current && !/\s/.test(text.slice(start, end))) return null;

    // Only the lines belonging to this paragraph: a drag that ran into the next
    // one drags its rects in too, and would place the palette under text that is
    // not selected.
    const anchor = () => {
      if (!el.isConnected) return null;
      const box = el.getBoundingClientRect();
      return unionRect(
        Array.from(range.getClientRects()).filter(
          (rect) => rect.bottom > box.top && rect.top < box.bottom
        )
      );
    };

    return { para, start, end, anchor };
  }, [containerRef, paragraphs, wordSelect]);
}
