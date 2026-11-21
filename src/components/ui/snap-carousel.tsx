"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface SnapCarouselContext {
  active: string;
  order: string[];
  gap: number;
  select: (value: string) => void;
  selectFromScroll: (value: string) => void;
  stopGlide: () => void;
  register: (value: string, element: HTMLElement) => () => void;
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

export interface SnapCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Space between items, in px. */
  gap?: number;
  /** Step with the wheel while the pointer is over the rail. */
  wheel?: boolean;
  /** Spring stiffness for programmatic scrolls. */
  spring?: number;
}

/**
 * A horizontally snapping picker whose active item is the one nearest the
 * centre. Programmatic scrolls use a spring instead of `scrollIntoView`, so the
 * rail can be stepped without fighting scroll-snap.
 *
 * Not Embla: shadcn's Carousel already exists, and this one is for pickers that
 * need the centred, peeking, spring-glide behaviour.
 */
function SnapCarousel({
  value,
  defaultValue,
  onValueChange,
  gap = 16,
  wheel = true,
  spring = 24,
  className,
  children,
  ...props
}: SnapCarouselProps) {
  const reduce = useReducedMotion();
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const [order, setOrder] = React.useState<string[]>([]);
  const active = value ?? uncontrolled;
  const contentRef = React.useRef<HTMLDivElement>(null);
  const elements = React.useRef(new Map<string, HTMLElement>());
  const glideRef = React.useRef<{
    raf: number;
    x: number;
    v: number;
    target: number;
    last: number;
  } | null>(null);
  const lastScrollAt = React.useRef(0);
  const gliding = React.useRef(false);
  const scrollRaf = React.useRef(0);
  const scrolledRef = React.useRef<string | null>(null);
  const centered = React.useRef(false);

  const emit = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [onValueChange, value]
  );

  const centerOf = React.useCallback((id: string) => {
    const content = contentRef.current;
    const item = elements.current.get(id);
    if (!content || !item) return null;
    // Layout metrics, not client rects: a peeking item is scaled, and its
    // scaled centre would send the glide to the wrong place.
    return item.offsetLeft + item.offsetWidth / 2 - content.clientWidth / 2;
  }, []);

  const stopGlide = React.useCallback(() => {
    const glide = glideRef.current;
    if (!glide) return;
    cancelAnimationFrame(glide.raf);
    glideRef.current = null;
    gliding.current = false;
    if (contentRef.current) delete contentRef.current.dataset.gliding;
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
    [centerOf, reduce, spring, stopGlide]
  );

  const select = React.useCallback(
    (next: string) => {
      if (next === active) return;
      scrolledRef.current = null;
      emit(next);
    },
    [active, emit]
  );

  /** A change that came from the rail's own scroll; do not glide to it again. */
  const selectFromScroll = React.useCallback(
    (next: string) => {
      if (next === active) return;
      scrolledRef.current = next;
      emit(next);
    },
    [active, emit]
  );

  const register = React.useCallback((id: string, element: HTMLElement) => {
    elements.current.set(id, element);
    setOrder((current) => (current.includes(id) ? current : [...current, id]));
    return () => {
      elements.current.delete(id);
      setOrder((current) => current.filter((item) => item !== id));
    };
  }, []);

  // Initial frame, external value changes, and the end of a click all land here.
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || !active || !order.includes(active)) return;
    if (!centered.current) {
      const target = centerOf(active);
      if (target !== null) content.scrollLeft = target;
      centered.current = true;
      return;
    }
    if (scrolledRef.current === active) {
      scrolledRef.current = null;
      return;
    }
    glideTo(active);
  }, [active, centerOf, glideTo, order]);

  // A width change re-centres instantly; the spring is for input, not resize.
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (!active || gliding.current) return;
      const target = centerOf(active);
      if (target !== null) content.scrollLeft = target;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [active, centerOf]);

  const context: SnapCarouselContext = {
    active,
    order,
    gap,
    select,
    selectFromScroll,
    stopGlide,
    register,
    contentRef,
    lastScrollAt,
    gliding,
  };

  return (
    <Context.Provider value={context}>
      <div
        data-slot="snap-carousel"
        className={cn("relative", className)}
        {...props}
      >
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
      </div>
    </Context.Provider>
  );
}

function SnapCarouselContent({
  className,
  style,
  onScroll,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const {
    active,
    gap,
    order,
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
      let nearest = active;
      let best = Number.POSITIVE_INFINITY;
      content.querySelectorAll<HTMLElement>("[data-snap-item]").forEach((item) => {
        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const distance = Math.abs(itemCenter - center);
        if (distance < best) {
          best = distance;
          nearest = item.dataset.value ?? nearest;
        }
      });
      if (nearest !== active && order.includes(nearest)) {
        selectFromScroll(nearest);
      }
    });
    onScroll?.(event);
  };

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const onWheel = (event: WheelEvent) => {
      const steps =
        event.deltaMode === 1 ||
        (Math.abs(event.deltaY) >= 50 && event.deltaX === 0);
      if (!steps) {
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stopGlide();
        return;
      }
      if (event.ctrlKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now < wheelGate.current) return;
      wheelGate.current = now + 200;
      const index = order.indexOf(active);
      const next = order[index + Math.sign(event.deltaY)];
      if (next) select(next);
    };
    content.addEventListener("wheel", onWheel, { passive: false });
    return () => content.removeEventListener("wheel", onWheel);
  }, [active, order, select, stopGlide]);

  return (
    <div
      ref={contentRef}
      data-slot="snap-carousel-content"
      onScroll={onRailScroll}
      onTouchStart={stopGlide}
      style={{ gap, ...style }}
      className={cn(
        "no-scrollbar relative flex items-center overflow-x-auto overflow-y-hidden outline-none [overscroll-behavior-x:contain]",
        className
      )}
      {...props}
    />
  );
}

function SnapCarouselItem({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { active, order, register } = useSnapCarousel();
  const ref = React.useRef<HTMLDivElement>(null);
  const index = order.indexOf(value);
  const activeIndex = order.indexOf(active);
  const peek =
    value === active ? "on" : index < activeIndex ? "before" : "after";

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    return register(value, ref.current);
  }, [register, value]);

  return (
    <div
      ref={ref}
      data-slot="snap-carousel-item"
      data-snap-item=""
      data-value={value}
      data-state={peek}
      data-peek={peek}
      role="group"
      aria-roledescription="slide"
      aria-current={peek === "on" || undefined}
      className={cn("flex-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  SnapCarousel,
  SnapCarouselContent,
  SnapCarouselItem,
  useSnapCarousel,
};
