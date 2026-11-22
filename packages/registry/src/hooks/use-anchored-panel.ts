"use client";

import { useMemo, useRef } from "react";

export type AnchoredPanelAnchor = Range | Element | DOMRect | (() => DOMRect | null) | null;

function resolve(anchor: AnchoredPanelAnchor): DOMRect | null {
  if (!anchor) return null;
  if (typeof anchor === "function") return anchor();
  if (typeof (anchor as Range).getBoundingClientRect === "function") {
    return (anchor as Range).getBoundingClientRect();
  }
  return anchor as DOMRect;
}

/**
 * A Radix/Popper anchor that reads its rect every time the popover updates.
 *
 * A text selection is not an element, so there is nothing to pass to
 * `PopoverAnchor`. This turns a range (or a function that measures one) into the
 * measurable virtual element Radix expects, so Popper can still flip, shift and
 * follow the page on scroll.
 *
 * The last real rect is kept while the panel animates out. A closing panel with
 * a null anchor would otherwise jump to 0,0 for one frame — a ghost flash in the
 * top-left corner.
 */
export function useAnchoredPanel(anchor: AnchoredPanelAnchor) {
  const last = useRef<{
    anchor: AnchoredPanelAnchor;
    rect: DOMRect | null;
  }>({ anchor: null, rect: null });

  return useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          if (anchor && last.current.anchor !== anchor) {
            last.current = { anchor, rect: null };
          }
          const rect = resolve(anchor);
          if (rect) last.current.rect = rect;
          return rect ?? last.current.rect ?? new DOMRect(0, 0, 0, 0);
        },
        getClientRects: () => {
          if (anchor && last.current.anchor !== anchor) {
            last.current = { anchor, rect: null };
          }
          const rect = resolve(anchor);
          if (rect) last.current.rect = rect;
          const kept = rect ?? last.current.rect;
          return kept ? [kept] : [];
        },
        contextElement: typeof document === "undefined" ? undefined : document.body,
      },
    }),
    [anchor],
  );
}
