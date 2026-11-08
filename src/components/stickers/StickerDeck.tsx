"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { STICKERS } from "./stickers";
import { cn } from "@/lib/utils";

const N = STICKERS.length;
/**
 * Centre-to-centre spacing as a multiple of the box size.
 *
 * Below 1 on purpose: the source PNGs carry ~12% transparent margin on each
 * side (up to 18% on the tightest pose), so spacing the boxes edge-to-edge
 * would leave a visible empty gutter between the stickers that are actually
 * drawn. Overlapping the boxes cancels that padding, so the gap you see is
 * between the artwork, not between the files.
 */
const RATIO = 0.78;

/**
 * The stickers are the control.
 *
 * At rest it is a single sticker. Hover the sticker (mouse) or tap it (touch)
 * and the whole set fans out into a row; leave or tap again and it gathers back
 * onto one. Click a sticker in the fan and the row gathers onto *that* one, so
 * the pick is deliberate instead of random.
 *
 * Sizing is derived from the measured container, never fixed: the open row
 * spans the full width it is given and the stickers grow to fill it, so a wide
 * column gets big stickers and a phone gets smaller ones rather than the row
 * drifting apart inside a fixed box.
 */
export function StickerDeck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const feedback = useFeedback();

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Row width = (N-1)*GAP + SIZE and GAP = RATIO*SIZE, so SIZE solves to fill.
  const size = width > 0 ? width / ((N - 1) * RATIO + 1) : 48;
  const gap = size * RATIO;

  const [open, setOpen] = useState(false);
  const [featured, setFeatured] = useState(0);

  const transition = reduce
    ? { duration: 0.001 }
    : { type: "spring" as const, stiffness: 320, damping: 30 };

  const pick = useCallback(
    (i: number) => {
      feedback.select();
      setFeatured(i);
      setOpen(false);
    },
    [feedback]
  );

  /**
   * Where sticker `i` sits right now. One source for art and hit-testing.
   *
   * Laid out from the left edge, not centred: the row's first card then shares
   * the left rail every other element in the section uses, and the closed
   * sticker does not jump sideways the instant the row opens.
   */
  const target = (i: number) => {
    if (open) {
      return {
        x: i * gap,
        scale: 1,
        rotate: STICKERS[i].tilt,
        opacity: 1,
        z: i,
        live: true,
      };
    }
    const isFront = i === featured;
    return {
      x: 0,
      scale: isFront ? 1 : 0.9,
      rotate: 0,
      opacity: isFront ? 1 : 0,
      z: isFront ? 100 : 0,
      live: isFront,
    };
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      // Just enough for the widest resting tilt (±8°) to clear the box.
      style={{ height: Math.round(size * 1.15) }}
      // Leaving the band gathers it. Opening is bound to the stickers, not this
      // band — the band is full width, so opening here would fire on any pass.
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
      onClick={() => {
        // Touch (and a deliberated click) toggles.
        feedback.select();
        setOpen((o) => !o);
      }}
    >
      {STICKERS.map((sticker, i) => {
        const t = target(i);
        return (
          <motion.button
            key={sticker.src}
            type="button"
            aria-label={sticker.alt}
            aria-hidden={!t.live}
            tabIndex={t.live ? 0 : -1}
            className={cn(
              "absolute top-1/2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              t.live ? "cursor-pointer" : "pointer-events-none"
            )}
            style={{
              width: size,
              height: size,
              marginTop: -size / 2,
              zIndex: t.z,
            }}
            initial={false}
            animate={{ x: t.x, scale: t.scale, rotate: t.rotate, opacity: t.opacity }}
            transition={transition}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setOpen(true);
            }}
            onClick={(e) => {
              // Only meaningful once the fan is out; otherwise the deck toggles.
              if (open) {
                e.stopPropagation();
                pick(i);
              }
            }}
          >
            <Image
              src={sticker.src}
              alt=""
              width={256}
              height={256}
              className="h-full w-full object-contain"
            />
          </motion.button>
        );
      })}
    </div>
  );
}
