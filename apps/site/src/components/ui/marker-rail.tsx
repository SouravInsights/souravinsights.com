"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Marker {
  id: number;
  /** 0..1 down the rail. */
  at: number;
  color: string;
  label: string;
}

export interface MarkerRailProps {
  markers: Marker[];
  onSelect: (id: number) => void;
  ariaLabel: string;
  height?: number;
  className?: string;
}

const END = 2;

/**
 * A thin rail with markers at measured positions.
 *
 * Data in, no popover: the caller decides where the rail sits and what its
 * surrounding control does. Each marker is a tooltip-backed hit target.
 */
function MarkerRail({
  markers,
  onSelect,
  ariaLabel,
  height = 200,
  className,
}: MarkerRailProps) {
  const [hot, setHot] = React.useState<number | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <Button
        type="button"
        variant="ghost"
        data-slot="marker-rail"
        aria-label={ariaLabel}
        className={cn(
          "group h-auto cursor-pointer rounded-lg px-0 py-4 pl-3 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <span className="relative block w-3.5" style={{ height }}>
          <span
            aria-hidden="true"
            className="absolute right-0 h-0.5 w-3.5 rounded-full bg-muted-foreground/55 transition-opacity duration-150 group-hover:bg-muted-foreground/80"
            style={{ top: 0 }}
          />
          {markers.map((marker) => (
            <Tooltip key={marker.id}>
              <TooltipTrigger asChild>
                <span
                  aria-label={marker.label}
                  onPointerEnter={() => setHot(marker.id)}
                  onPointerLeave={() => setHot(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(marker.id);
                  }}
                  style={{
                    top: marker.at * (height - END),
                    backgroundColor: marker.color,
                    scale: hot === marker.id ? "1.6 1" : "1 1",
                  }}
                  className="absolute right-0 h-0.5 w-3.5 origin-right rounded-full transition-[opacity,scale] duration-150"
                />
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={12}
                className="max-w-[18rem] text-[12px] leading-snug"
              >
                {marker.label}
              </TooltipContent>
            </Tooltip>
          ))}
          <span
            aria-hidden="true"
            className="absolute right-0 h-0.5 w-3.5 rounded-full bg-muted-foreground/55 transition-opacity duration-150 group-hover:bg-muted-foreground/80"
            style={{ top: height - END }}
          />
        </span>
      </Button>
    </TooltipProvider>
  );
}

export { MarkerRail };
