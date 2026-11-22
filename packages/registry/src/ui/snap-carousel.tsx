"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface SnapCarouselContext {
  value: string;
  items: string[];
  gap: number;
  select: (value: string) => void;
  selectFromScroll: (value: string) => void;
  stopGlide: () => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  lastScrollAt: React.MutableRefObject<number>;
  gliding: React.MutableRefObject<boolean>;
}

const Context = React.createContext<SnapCarouselContext | null>(null);

function useSnapCarousel() {
  const context = React.useContext(Context);
  if (!context) throw new Error("SnapCarousel parts must be used inside SnapCarousel");
  return context;
}

export interface SnapCarouselProps {
  /** Ordered ids, so the primitive knows which item is before/after. */
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  /** Space between items. */
  gap?: number;
  /** Changing this recentres instantly, e.g. on open or a size change. */
  recenterKey?: unknown;
  /** Spring stiffness for programmatic scrolls. */
  spring?: number;
  children: React.ReactNode;
}

/**
 * A horizontally snapping picker whose active item is the one nearest the
 * centre. The glide is a spring; the item CSS is a 240ms scale transition, so
 * the rail feels like the one in the share sheet.
 *
 * The root renders no DOM: the caller's content is the rail, with no wrapper to
 * change layout or stacking.
 */
function SnapCarousel({
  items,
  value,
  onValueChange,
  gap = 16,
  recenterKey,
  spring = 24,
  children,
}: SnapCarouselProps) {
  const reduce = useReducedMotion();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const lastScrollAt = React.useRef(0);
  const gliding = React.useRef(false);
  const suppressGlide = React.useRef<string | null>(null);
  const glideRef = React.useRef<{
    raf: number;
    x: number;
    v: number;
    target: number;
    last: number;
  } | null>(null);

  const centerOf = React.useCallback((id: string) => {
    const content = contentRef.current;
    const item = content?.querySelector<HTMLElement>(
      `[data-slot="snap-carousel-item"][data-value="${id}"]`,
    );
    if (!content || !item) return null;
    // offset metrics, not client rects: a peeking item is scaled.
    return item.offsetLeft + item.offsetWidth / 2 - content.clientWidth / 2;
  }, []);

  const stopGlide = React.useCallback(() => {
    const glide = glideRef.current;
    if (!glide) return;
    cancelAnimationFrame(glide.raf);
    glideRef.current = null;
    gliding.current = false;
    const content = contentRef.current;
    if (content) delete content.dataset.gliding;
  }, []);

  const glideTo = React.useCallback(
    (id: string) => {
      const content = contentRef.current;
      const target = centerOf(id);
      if (!content || target === null) return;
      if (reduce) {
        stopGlide();
        content.scrollLeft = target;
        return;
      }
      if (glideRef.current) {
        glideRef.current.target = target;
        return;
      }
      if (Math.abs(content.scrollLeft - target) < 1) return;
      content.dataset.gliding = "true";
      gliding.current = true;
      const glide = {
        x: content.scrollLeft,
        v: 0,
        target,
        last: performance.now(),
        raf: 0,
      };
      glideRef.current = glide;
      const step = (now: number) => {
        const dt = Math.min(0.05, (now - glide.last) / 1000);
        glide.last = now;
        const a = glide.x - glide.target;
        const o = glide.v + spring * a;
        const s = Math.exp(-spring * dt);
        glide.x = glide.target + (a + o * dt) * s;
        glide.v = (o - spring * (a + o * dt)) * s;
        if (Math.abs(glide.x - glide.target) < 0.5 && Math.abs(glide.v) < 30) {
          content.scrollLeft = glide.target;
          stopGlide();
        } else {
          content.scrollLeft = glide.x;
          glide.raf = requestAnimationFrame(step);
        }
      };
      glide.raf = requestAnimationFrame(step);
    },
    [centerOf, reduce, spring, stopGlide],
  );

  const select = React.useCallback(
    (next: string) => {
      if (next === value) return;
      suppressGlide.current = null;
      onValueChange(next);
    },
    [onValueChange, value],
  );

  const selectFromScroll = React.useCallback(
    (next: string) => {
      if (next === value) return;
      suppressGlide.current = next;
      onValueChange(next);
    },
    [onValueChange, value],
  );

  // A caller-driven change glides. One that came from the rail's own scroll does not.
  React.useEffect(() => {
    if (suppressGlide.current === value) {
      suppressGlide.current = null;
      return;
    }
    glideTo(value);
  }, [glideTo, value]);

  // Open, resize or a mode change: land instantly, like the share sheet.
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    stopGlide();
    const target = centerOf(value);
    if (target !== null) content.scrollLeft = target;
    return stopGlide;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  const context: SnapCarouselContext = {
    value,
    items,
    gap,
    select,
    selectFromScroll,
    stopGlide,
    contentRef,
    lastScrollAt,
    gliding,
  };

  return (
    <Context.Provider value={context}>
      <style>{`
        [data-slot="snap-carousel-content"] { scroll-snap-type: x mandatory; }
        [data-slot="snap-carousel-content"][data-gliding="true"] { scroll-snap-type: none; }
        [data-slot="snap-carousel-item"] {
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition: scale 240ms cubic-bezier(.2,0,0,1), opacity 150ms ease-out;
        }
        [data-slot="snap-carousel-item"][data-peek="before"] { transform-origin: 100%; scale: .92; }
        [data-slot="snap-carousel-item"][data-peek="after"]  { transform-origin: 0;    scale: .92; }
        [data-slot="snap-carousel-item"][data-peek="before"]:hover,
        [data-slot="snap-carousel-item"][data-peek="after"]:hover { scale: .95; }
        @media (prefers-reduced-motion: reduce) {
          [data-slot="snap-carousel-item"] { transition: none; }
        }
      `}</style>
      {children}
    </Context.Provider>
  );
}

export interface SnapCarouselContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SnapCarouselContent = React.forwardRef<HTMLDivElement, SnapCarouselContentProps>(
  function SnapCarouselContent({ className, style, onScroll, ...props }, forwardedRef) {
    const {
      value,
      items,
      gap,
      select,
      selectFromScroll,
      stopGlide,
      contentRef,
      lastScrollAt,
      gliding,
    } = useSnapCarousel();
    const scrollRaf = React.useRef(0);
    const wheelGate = React.useRef(0);

    const onRailScroll = (event: React.UIEvent<HTMLDivElement>) => {
      lastScrollAt.current = performance.now();
      const content = contentRef.current;
      if (!content) return;
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(() => {
        if (gliding.current) return;
        const center = content.scrollLeft + content.clientWidth / 2;
        let nearest = value;
        let best = Number.POSITIVE_INFINITY;
        content
          .querySelectorAll<HTMLElement>('[data-slot="snap-carousel-item"]')
          .forEach((item) => {
            const itemCenter = item.offsetLeft + item.offsetWidth / 2;
            const distance = Math.abs(itemCenter - center);
            if (distance < best) {
              best = distance;
              nearest = item.dataset.value ?? nearest;
            }
          });
        if (nearest !== value && items.includes(nearest)) {
          selectFromScroll(nearest);
        }
      });
      onScroll?.(event);
    };

    React.useEffect(() => {
      const content = contentRef.current;
      if (!content) return;
      const onWheel = (event: WheelEvent) => {
        const steps = event.deltaMode === 1 || (Math.abs(event.deltaY) >= 50 && event.deltaX === 0);
        if (!steps) {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stopGlide();
          return;
        }
        if (event.ctrlKey) return;
        event.preventDefault();
        const now = performance.now();
        if (now < wheelGate.current) return;
        wheelGate.current = now + 200;
        const next = items[items.indexOf(value) + Math.sign(event.deltaY)];
        if (next) select(next);
      };
      content.addEventListener("wheel", onWheel, { passive: false });
      return () => content.removeEventListener("wheel", onWheel);
    }, [contentRef, items, select, stopGlide, value]);

    return (
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        data-slot="snap-carousel-content"
        onScroll={onRailScroll}
        onTouchStart={stopGlide}
        style={{ gap, ...style }}
        className={cn(
          "no-scrollbar relative flex items-center overflow-x-auto overflow-y-hidden outline-none [overscroll-behavior-x:contain]",
          className,
        )}
        {...props}
      />
    );
  },
);
SnapCarouselContent.displayName = "SnapCarouselContent";

export interface SnapCarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SnapCarouselItem = React.forwardRef<HTMLDivElement, SnapCarouselItemProps>(
  function SnapCarouselItem({ value, className, children, ...props }, forwardedRef) {
    const { value: active, items } = useSnapCarousel();
    const index = items.indexOf(value);
    const activeIndex = items.indexOf(active);
    const peek = value === active ? "on" : index < activeIndex ? "before" : "after";

    return (
      <div
        ref={(node) => {
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        data-slot="snap-carousel-item"
        data-value={value}
        data-peek={peek}
        role="group"
        aria-roledescription="slide"
        aria-current={peek === "on" || undefined}
        className={cn("relative flex-none", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SnapCarouselItem.displayName = "SnapCarouselItem";

export { SnapCarousel, SnapCarouselContent, SnapCarouselItem, useSnapCarousel };
