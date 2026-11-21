"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SidePanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  open: boolean;
  children: React.ReactNode;
  side?: "left" | "right";
  /** The content column's width. */
  width?: number;
}

/**
 * A panel that pushes content on a wide screen and overlays it on a narrow one.
 *
 * On a phone it is the scroller and slides with the `translate` property. On a
 * desktop it is a width-animated wrapper with a fixed-width scroller pinned to
 * the stage edge, so its contents slide in instead of reflowing.
 *
 * Unlike `Sheet`, it is not modal and does not trap focus.
 */
function SidePanel({
  open,
  children,
  side = "left",
  width = 288,
  className,
  onScroll,
  ...props
}: SidePanelProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const left = side === "left";

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-slot="side-panel"
      data-state={open ? "open" : "closed"}
      data-side={side}
      aria-hidden={!open}
      style={
        {
          "--side-panel-width": `${width}px`,
          "--side-panel-shift": open ? "0" : left ? "-100%" : "100%",
        } as React.CSSProperties
      }
      onScroll={onScroll}
      className={cn(
        "absolute inset-y-0 z-20 w-[var(--side-panel-width)] overflow-y-auto overscroll-contain bg-background shadow-[12px_0_32px_-12px_rgba(0,0,0,0.4)] [scrollbar-width:thin]",
        "transition-[translate,opacity] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        "[translate:var(--side-panel-shift)] lg:[translate:0]",
        left ? "left-0" : "right-0",
        "lg:relative lg:inset-auto lg:z-auto lg:shrink-0 lg:w-0 lg:overflow-hidden lg:shadow-none lg:transition-[width]",
        open
          ? "opacity-100 lg:w-[var(--side-panel-width)]"
          : "pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 z-[2] w-px bg-border opacity-0 transition-opacity duration-150",
          left ? "right-0" : "left-0",
          open && "lg:opacity-100"
        )}
      />
      <div
        data-slot="side-panel-content"
        onScroll={onScroll}
        className={cn(
          "w-[var(--side-panel-width)] bg-background [scrollbar-width:thin]",
          left ? "lg:absolute lg:inset-y-0 lg:right-0" : "lg:absolute lg:inset-y-0 lg:left-0",
          "lg:overflow-y-auto lg:overscroll-contain",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export { SidePanel };
