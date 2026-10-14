"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PreviewLoader } from "@/components/ui/PreviewLoader";
import { useIsTouchDevice } from "@/components/ui/PreviewCard";
import { cn } from "@/lib/utils";

/** The hover card's frame. The captured image is wider than this and is scaled
 *  to fit, so the pan distance is derived from the real image dimensions. */
const CARD_WIDTH = 260;
const CARD_HEIGHT = 163;

interface ScrollPreviewContextValue {
  previews: Record<string, string>;
  warm: (url: string) => void;
}

const ScrollPreviewContext = createContext<ScrollPreviewContextValue | null>(
  null
);

/**
 * Warms the tall captures once for a small, fixed set of links — the home page's
 * companies and side projects. The set is tiny, so two at a time is plenty and
 * the retry-by-reload behaviour of `warmed` is not needed.
 */
export function ScrollPreviewProvider({
  urls,
  children,
}: {
  urls: string[];
  children: ReactNode;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const warmed = useRef<Set<string>>(new Set());
  const queue = useRef<string[]>([]);
  const running = useRef(0);

  const pump = useCallback(() => {
    while (running.current < 2 && queue.current.length > 0) {
      const url = queue.current.shift();
      if (!url) break;
      running.current += 1;
      fetch(
        `/api/link-preview?url=${encodeURIComponent(url)}&variant=scroll&json=1`
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { preview?: string } | null) => {
          if (data?.preview) {
            setPreviews((prev) => ({ ...prev, [url]: data.preview as string }));
          }
        })
        .catch(() => undefined)
        .finally(() => {
          running.current -= 1;
          pump();
        });
    }
  }, []);

  const warm = useCallback(
    (url: string) => {
      if (!url || warmed.current.has(url)) return;
      warmed.current.add(url);
      queue.current.push(url);
      pump();
    },
    [pump]
  );

  useEffect(() => {
    urls.forEach(warm);
  }, [urls, warm]);

  return (
    <ScrollPreviewContext.Provider value={{ previews, warm }}>
      {children}
    </ScrollPreviewContext.Provider>
  );
}

/** The tall image, panned from top to bottom once the card opens. */
function ScrollImage({ src, name }: { src: string; name: string }) {
  const reduceMotion = useReducedMotion();
  const [renderedHeight, setRenderedHeight] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // The image is CARD_WIDTH wide, so its height scales with the aspect ratio.
  const measure = useCallback(() => {
    const image = imageRef.current;
    if (image && image.naturalWidth > 0) {
      setRenderedHeight(
        (image.naturalHeight / image.naturalWidth) * CARD_WIDTH
      );
    }
  }, []);

  // A cached image can be complete before React attaches `onLoad`, so measure
  // once on mount as well.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) measure();
  }, [measure]);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center bg-foreground/5 px-4"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        <span className="type-caption text-faint-foreground">{name}</span>
      </div>
    );
  }

  // The image is CARD_WIDTH wide, so its height scales with the aspect ratio.
  const travel = renderedHeight
    ? Math.max(0, renderedHeight - CARD_HEIGHT)
    : 0;
  // Longer pages get a longer pan, but never so long the card overstays.
  const duration = Math.min(12, Math.max(5, travel / 100));

  return (
    <div
      className="relative overflow-hidden bg-foreground/5"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <motion.img
        ref={imageRef}
        src={src}
        alt={`Scrolling preview of ${name}`}
        onLoad={measure}
        onError={() => setFailed(true)}
        initial={{ y: 0 }}
        animate={{ y: reduceMotion ? 0 : -travel }}
        transition={{ duration, ease: [0.45, 0, 0.55, 1], delay: 0.6 }}
        draggable={false}
        className="absolute left-0 top-0 w-full max-w-none select-none"
      />
      {/* A quiet cue that the page keeps going below the fold. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/70 to-transparent" />
    </div>
  );
}

export function ScrollPreviewTrigger({
  url,
  name,
  children,
}: {
  url: string;
  name: string;
  children: ReactNode;
}) {
  const isTouchDevice = useIsTouchDevice();
  const context = useContext(ScrollPreviewContext);
  const src = context?.previews[url];
  // Anchor the card to the pointer, not to the trigger's box. A tall trigger (a
  // project card) would otherwise open the card below the whole box, far from
  // the cursor. `alignOffset` moves it along the horizontal axis, `sideOffset`
  // along the vertical one — both measured from the trigger.
  const [alignOffset, setAlignOffset] = useState(-CARD_WIDTH / 2);
  const [sideOffset, setSideOffset] = useState(10);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  if (isTouchDevice) return <>{children}</>;

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Centre on the cursor horizontally, sit just under it vertically. Then
    // clamp to the viewport ourselves — Radix's collision shift would otherwise
    // fight an offset that deliberately overlaps the trigger.
    const margin = 12;
    const left = Math.min(
      Math.max(margin, event.clientX - CARD_WIDTH / 2),
      window.innerWidth - CARD_WIDTH - margin
    );
    let top = event.clientY + 16;
    if (top + CARD_HEIGHT > window.innerHeight - margin) {
      // No room below: open above the cursor instead.
      top = event.clientY - CARD_HEIGHT - 16;
    }
    const nextAlign = left - rect.left;
    const nextSide = Math.max(margin, top) - rect.bottom;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setAlignOffset(nextAlign);
      setSideOffset(nextSide);
    });
  };

  return (
    <TooltipPrimitive.Root
      onOpenChange={(open) => {
        if (open) context?.warm(url);
      }}
    >
      <TooltipPrimitive.Trigger asChild onMouseMove={handleMouseMove}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="bottom"
          sideOffset={sideOffset}
          align="start"
          alignOffset={alignOffset}
          avoidCollisions={false}
          className={cn(
            "pointer-events-none z-50 overflow-hidden rounded-lg border border-border bg-background shadow-lg shadow-black/10",
            "origin-[var(--radix-tooltip-content-transform-origin)]",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
            "data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          {src ? (
            <ScrollImage src={src} name={name} />
          ) : (
            <div
              className="relative"
              style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            >
              <PreviewLoader />
            </div>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
