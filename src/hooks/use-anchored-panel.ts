"use client";

import { useMemo } from "react";

export type AnchoredPanelAnchor =
  | Range
  | Element
  | DOMRect
  | (() => DOMRect | null)
  | null;

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
 */
export function useAnchoredPanel(anchor: AnchoredPanelAnchor) {
  return useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const rect = resolve(anchor);
          return rect ?? new DOMRect(0, 0, 0, 0);
        },
        getClientRects: () => {
          const rect = resolve(anchor);
          return rect ? [rect] : [];
        },
        contextElement:
          typeof document === "undefined" ? undefined : document.body,
      },
    }),
    [anchor]
  );
}
