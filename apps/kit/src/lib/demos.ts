import type { ComponentType } from "react";
import { HighlightDemo } from "@/components/demos/highlight-demo";
import { QuoteDialogDemo } from "@/components/demos/quote-dialog-demo";

export const demos: Record<string, ComponentType> = {
  "highlight-demo": HighlightDemo,
  "quote-dialog-demo": QuoteDialogDemo,
};
