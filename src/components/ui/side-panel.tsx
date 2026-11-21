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
 * Unlike `Sheet`, it is not modal and does not trap focus: it belongs to the
 * layout it sits in. The desktop width and the mobile slide are CSS transitions,
 * so there is no client-only breakpoint read and no hydration branch.
 */
function SidePanel({
  open,
  children,
  side = "left",
  width = 288,
  className,
  ...props
}: SidePanelProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open]);

  const left = side === "left";

  return (
    <div
      ref={rootRef}
      data-slot="side-panel"
      data-state={open ? "open" : "closed"}
      data-side={side}
      aria-hidden={!open}
      style={{ "--side-panel-width": `${width}px` } as React.CSSProperties}
      className={cn(
        "absolute inset-y-0 z-20 w-[var(--side-panel-width)] overflow-hidden bg-background shadow-[12px_0_32px_-12px_rgba(0,0,0,0.4)] transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        left ? "left-0" : "right-0",
        "lg:relative lg:inset-auto lg:z-auto lg:w-0 lg:shadow-none lg:transition-[width]",
        open
          ? "translate-x-0 opacity-100 lg:w-[var(--side-panel-width)]"
          : cn(
              "opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto",
              left ? "-translate-x-full" : "translate-x-full"
            )
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
        className={cn(
          "absolute inset-y-0 w-[var(--side-panel-width)] overflow-y-auto overscroll-contain bg-background [scrollbar-width:thin]",
          left ? "left-0" : "right-0",
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
