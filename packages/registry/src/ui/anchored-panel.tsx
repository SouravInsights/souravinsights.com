"use client";

import * as React from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Arrow } from "@radix-ui/react-popover";
import {
  useAnchoredPanel,
  type AnchoredPanelAnchor,
} from "@/hooks/use-anchored-panel";
import { cn } from "@/lib/utils";

export interface AnchoredPanelProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof PopoverContent>,
    "side" | "align" | "sideOffset"
  > {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A range, element, rect, or a function that measures one. */
  anchor: AnchoredPanelAnchor;
  sideOffset?: number;
  arrow?: boolean;
}

/**
 * A popover pinned to a rect that has no trigger element.
 *
 * Radix owns positioning (via a virtual anchor), collision handling, arrow
 * placement, outside dismissal and Escape. The panel only owns its skin.
 */
const AnchoredPanel = React.forwardRef<HTMLDivElement, AnchoredPanelProps>(
  function AnchoredPanel(
    {
      open,
      onOpenChange,
      anchor,
      sideOffset = 8,
      arrow = false,
      className,
      children,
      onOpenAutoFocus,
      onCloseAutoFocus,
      collisionPadding = 8,
      ...props
    },
    ref
  ) {
  const virtualRef = useAnchoredPanel(anchor);

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        ref={ref}
        data-slot="anchored-panel"
        side="top"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseAutoFocus?.(event);
        }}
        className={cn("w-auto p-3", className)}
        {...props}
      >
        {children}
        {arrow && (
          <Arrow asChild width={20} height={10}>
            <svg
              width={20}
              height={10}
              viewBox="0 0 20 10"
              aria-hidden="true"
              className="overflow-visible"
            >
              <path d="M1 -1 L10 9 L19 -1 Z" fill="hsl(var(--background))" />
              <path
                d="M1 0 L10 9 L19 0"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </Arrow>
        )}
      </PopoverContent>
    </Popover>
    );
  }
);
AnchoredPanel.displayName = "AnchoredPanel";

export { AnchoredPanel };
