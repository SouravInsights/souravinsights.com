"use client";

import * as React from "react";
import { Canvas } from "@/components/ui/canvas";
import {
  MODES,
  type Mode,
} from "./presets";
import { drawCard, resolveOptions, type Overrides } from "./render";
import type { ShareTheme, Variant } from "./themes";

export interface QuoteContent {
  quote: string;
  title: string;
  publication: string;
  context: string;
}

export interface QuoteCardProps {
  theme: ShareTheme;
  variant: Variant;
  overrides?: Overrides;
  content: QuoteContent;
  mode: Mode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

/** One quote card, drawn at export resolution and scaled to its box. */
function QuoteCard({
  theme,
  variant,
  overrides = {},
  content,
  mode,
  className,
  style,
  "aria-label": ariaLabel,
}: QuoteCardProps) {
  const dims = MODES.find((item) => item.id === mode) ?? MODES[0];
  const options = React.useMemo(
    () => resolveOptions(theme, variant, overrides, content),
    [theme, variant, overrides, content]
  );

  return (
    <Canvas
      width={dims.width}
      height={dims.height}
      deps={[mode, options]}
      aria-label={ariaLabel ?? `${theme.name} design preview`}
      className={className}
      style={style}
      draw={(ctx) => drawCard(ctx, mode, theme, options)}
    />
  );
}

export { QuoteCard };
