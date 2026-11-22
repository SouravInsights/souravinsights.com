import type { ComponentType } from "react";

import { HighlightDemo } from "@/components/demos/highlight-demo";
import { HighlightControlledDemo } from "@/components/demos/highlight-controlled-demo";
import { HighlightAnchorDemo } from "@/components/demos/highlight-anchor-demo";
import { HighlightPaletteDemo } from "@/components/demos/highlight-palette-demo";
import { HighlightWaveDemo } from "@/components/demos/highlight-wave-demo";
import { UseTextSelectionDemo } from "@/components/demos/use-text-selection-demo";
import { UseReducedMotionDemo } from "@/components/demos/use-reduced-motion-demo";
import { QuoteDialogDemo } from "@/components/demos/quote-dialog-demo";
import { QuoteActionsDemo } from "@/components/demos/quote-actions-demo";
import { QuoteCarouselDemo } from "@/components/demos/quote-carousel-demo";
import { QuoteOptionsDemo } from "@/components/demos/quote-options-demo";
import { QuoteCardDemo } from "@/components/demos/quote-card-demo";
import { QuoteVariantPickerDemo } from "@/components/demos/quote-variant-picker-demo";
import { QuotePresetsDemo } from "@/components/demos/quote-presets-demo";
import { QuoteThemesDemo } from "@/components/demos/quote-themes-demo";
import { QuoteRenderDemo } from "@/components/demos/quote-render-demo";
import { ArticleHighlightsDemo } from "@/components/demos/article-highlights-demo";
import { QuoteShareDemo } from "@/components/demos/quote-share-demo";
import { AnchoredPanelDemo } from "@/components/demos/anchored-panel-demo";
import { CanvasDemo } from "@/components/demos/canvas-demo";
import { ColorFieldDemo } from "@/components/demos/color-field-demo";
import { ColorPickerDemo } from "@/components/demos/color-picker-demo";
import { InlineEditFieldDemo } from "@/components/demos/inline-edit-field-demo";
import { MarkerRailDemo } from "@/components/demos/marker-rail-demo";
import { SidePanelDemo } from "@/components/demos/side-panel-demo";
import { SnapCarouselDemo } from "@/components/demos/snap-carousel-demo";
import { SwatchDemo } from "@/components/demos/swatch-demo";

export const demos: Record<string, ComponentType> = {
  "highlight-demo": HighlightDemo,
  "highlight-controlled-demo": HighlightControlledDemo,
  "highlight-anchor-demo": HighlightAnchorDemo,
  "highlight-palette-demo": HighlightPaletteDemo,
  "highlight-wave-demo": HighlightWaveDemo,
  "use-text-selection-demo": UseTextSelectionDemo,
  "use-reduced-motion-demo": UseReducedMotionDemo,
  "quote-dialog-demo": QuoteDialogDemo,
  "quote-actions-demo": QuoteActionsDemo,
  "quote-carousel-demo": QuoteCarouselDemo,
  "quote-options-demo": QuoteOptionsDemo,
  "quote-card-demo": QuoteCardDemo,
  "quote-variant-picker-demo": QuoteVariantPickerDemo,
  "quote-presets-demo": QuotePresetsDemo,
  "quote-themes-demo": QuoteThemesDemo,
  "quote-render-demo": QuoteRenderDemo,
  "article-highlights-demo": ArticleHighlightsDemo,
  "quote-share-demo": QuoteShareDemo,
  "anchored-panel-demo": AnchoredPanelDemo,
  "canvas-demo": CanvasDemo,
  "color-field-demo": ColorFieldDemo,
  "color-picker-demo": ColorPickerDemo,
  "inline-edit-field-demo": InlineEditFieldDemo,
  "marker-rail-demo": MarkerRailDemo,
  "side-panel-demo": SidePanelDemo,
  "snap-carousel-demo": SnapCarouselDemo,
  "swatch-demo": SwatchDemo,
};
