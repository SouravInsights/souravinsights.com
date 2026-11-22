"use client";

import * as React from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useAnchoredPanel, type AnchoredPanelAnchor } from "@/hooks/use-anchored-panel";
import { cn } from "@/lib/utils";

export interface AnchoredPanelProps extends Omit<
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
const AnchoredPanel = React.forwardRef<HTMLDivElement, AnchoredPanelProps>(function AnchoredPanel(
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
  ref,
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
        className={cn("group w-auto p-3", className)}
        {...props}
      >
        {children}
        {arrow && (
          <span
            data-slot="anchored-panel-arrow"
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute flex w-5 justify-center",
              "group-data-[side=top]:-bottom-2.5 group-data-[side=top]:left-1/2 group-data-[side=top]:-translate-x-1/2",
              "group-data-[side=bottom]:-top-2.5 group-data-[side=bottom]:left-1/2 group-data-[side=bottom]:-translate-x-1/2 group-data-[side=bottom]:rotate-180",
              "group-data-[side=left]:top-1/2 group-data-[side=left]:-right-2.5 group-data-[side=left]:-translate-y-1/2 group-data-[side=left]:-rotate-90",
              "group-data-[side=right]:top-1/2 group-data-[side=right]:-left-2.5 group-data-[side=right]:-translate-y-1/2 group-data-[side=right]:rotate-90",
            )}
          >
            <svg width="20" height="10" viewBox="0 0 20 10" className="overflow-visible">
              <path d="M1 -1 L10 9 L19 -1 Z" fill="hsl(var(--background))" />
              <path
                d="M1 0 L10 9 L19 0"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </PopoverContent>
    </Popover>
  );
});
AnchoredPanel.displayName = "AnchoredPanel";

export { AnchoredPanel };
