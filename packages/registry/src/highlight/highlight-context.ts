"use client";

import { createContext, useContext, type Ref } from "react";
import type { HighlightSpan } from "@/lib/highlight-anchor";

export type HighlightOpen =
  | {
      kind: "new";
      para: number;
      start: number;
      end: number;
      /** measured in viewport coordinates, read again on every scroll */
      anchor: () => DOMRect | null;
    }
  | {
      kind: "edit";
      id: number;
      viaKey: boolean;
      anchor: () => DOMRect | null;
    };

/** a mark plus its server row id once persistence has answered */
export interface HighlightMark extends HighlightSpan {
  rowId?: number;
}

export interface HighlightContextValue {
  open: HighlightOpen | null;
  marks: HighlightMark[];
  current: HighlightMark | undefined;
  ordered: HighlightMark[];
  said: string;
  setSaid: (text: string) => void;
  close: (restore: boolean) => void;
  pick: (hue: number) => void;
  remove: () => void;
  selectMark: (id: number) => void;
  shareable: () => { quote: string; context: string } | null;
  permalinkRange: () => Range | null;
  onShareQuote: (payload: { quote: string; context: string }) => void;
  onCopyLink?: (range: Range | null) => Promise<boolean>;
  panelRef: Ref<HTMLDivElement>;
  textOf: (para: number) => string;
}

export const HighlightContext = createContext<HighlightContextValue | null>(null);

export function useHighlight() {
  const context = useContext(HighlightContext);
  if (!context) throw new Error("Highlight parts must be used inside Highlight");
  return context;
}
