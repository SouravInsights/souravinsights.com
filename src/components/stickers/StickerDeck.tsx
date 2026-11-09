"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { STICKERS } from "./stickers";
import { cn } from "@/lib/utils";

const N = STICKERS.length;
/** Sum of the content aspects — the row's width in units of its own height. */
const SUM_ASPECT = STICKERS.reduce((sum, s) => sum + s.aspect, 0);
/** Breathing room between stickers, as a fraction of the row height. */
const GAP_RATIO = 0.12;
/** Extra lean, in degrees, a poked sticker rocks into. */
const POKE_LEAN = 7;
const STORAGE_KEY = "hero-stickers";

/**
 * The stickers are the control.
 *
 * At rest it is a single sticker. Hover the sticker (mouse) or tap it (touch)
 * and the set fans out; leave, or tap again, and it gathers back onto one. A
 * click on a sticker in the fan gathers the row onto *that* one, so the pick is
 * deliberate rather than random.
 *
 * In the fan, pointing at a sticker (mouse) or pressing it (touch) *pokes* it:
 * it rocks further into its own tilt and rings down, and its neighbours flinch
 * off it. Rotation only — the artwork is a face, so nothing scales or warps.
 *
 * Laid out by content, not by file. The PNGs are trimmed to their artwork and
 * each carries its own aspect, so every sticker gets a box that matches it: the
 * row spans the full measured width, the artwork fills its box edge to edge,
 * and the gap you see is a real gap rather than transparent margin. Before,
 * ~25% of the row was empty pixels inside the files.
 *
 * The choice sticks: whether the row was left open, and which sticker was
 * picked, are both kept in localStorage and restored on the next visit.
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

  // Row height solves so that sum(widths) + gaps fills the measured container.
  const rowH = width > 0 ? width / (SUM_ASPECT + (N - 1) * GAP_RATIO) : 80;
  const gap = rowH * GAP_RATIO;
  const widths = useMemo(() => STICKERS.map((s) => s.aspect * rowH), [rowH]);
  const offsets = useMemo(() => {
    const xs: number[] = [];
    let acc = 0;
    for (let i = 0; i < N; i++) {
      xs.push(acc);
      acc += widths[i] + gap;
    }
    return xs;
  }, [widths, gap]);

  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  // The sticker the pointer is on (mouse) or the finger is pressing (touch).
  // This is the play: the fan pokes the sticker under the pointer.
  const [active, setActive] = useState<number | null>(null);
  const [featured, setFeatured] = useState(0);
  const [ready, setReady] = useState(false);
  // After a pick, the pointer is still over the deck — so hover must not
  // immediately re-open what the click just gathered. Held until it leaves.
  const suppressHover = useRef(false);

  // Restore what the visitor left behind.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { pinned?: unknown; featured?: unknown };
        if (typeof saved.pinned === "boolean") setPinned(saved.pinned);
        if (
          typeof saved.featured === "number" &&
          saved.featured >= 0 &&
          saved.featured < N
        ) {
          setFeatured(saved.featured);
        }
      }
    } catch {
      // A blocked or corrupt store just means the default state.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pinned, featured }));
    } catch {
      // Ignore: the deck still works, the choice just will not persist.
    }
  }, [pinned, featured, ready]);

  // Hover is transient, the click is a decision — the row stays open if either.
  const open = pinned || hovering;

  const transition = reduce
    ? { duration: 0.001 }
    : { type: "spring" as const, stiffness: 320, damping: 30 };
  // The poke. A deliberately underdamped spring: it overshoots the lean and
  // rings down over ~0.5s, so the sticker rocks to a stop instead of gliding
  // there. Bounce is normally rationed; this is the site's one playful surface,
  // so it earns it. The physics ARE the wobble — nothing is keyframed, so the
  // motion stays interruptible and carries velocity across re-entries.
  const poke = reduce
    ? { duration: 0.001 }
    : { type: "spring" as const, duration: 0.5, bounce: 0.4 };

  const pick = useCallback(
    (i: number) => {
      feedback.select();
      setFeatured(i);
      setPinned(false);
      suppressHover.current = true;
      setHovering(false);
      setActive(null);
    },
    [feedback]
  );

  /** Where sticker `i` sits right now. One source for art and hit-testing. */
  const target = (i: number) => {
    if (open) {
      const poked = i === active;
      // A poke is felt by the row: the neighbours flinch off it.
      const neighbour = active !== null && Math.abs(i - active) === 1;
      const away = active === null ? 0 : Math.sign(i - active);
      return {
        x: offsets[i],
        scale: 1,
        // Poked, it rocks further into its own tilt. Rotation only: the art is
        // a face, and any non-uniform scale warps it.
        rotate: poked
          ? STICKERS[i].tilt + (STICKERS[i].tilt < 0 ? -POKE_LEAN : POKE_LEAN)
          : STICKERS[i].tilt + (neighbour ? away * 2 : 0),
        opacity: 1,
        z: poked ? 200 : i,
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
      // Just enough for the widest resting tilt to clear the box.
      style={{ height: Math.round(rowH * 1.18) }}
      // Leaving gathers it. Opening is bound to the stickers, not this band —
      // the band is full width, so opening here would fire on any pass.
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        suppressHover.current = false;
        setHovering(false);
        setActive(null);
      }}
      onClick={() => {
        // A click on the deck (not on a sticker) pins the row open or shut.
        feedback.select();
        setPinned((p) => !p);
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
              left: 0,
              width: Math.round(widths[i]),
              height: Math.round(rowH),
              marginTop: -rowH / 2,
              zIndex: t.z,
            }}
            initial={false}
            animate={{
              x: t.x,
              scale: t.scale,
              rotate: t.rotate,
              opacity: t.opacity,
            }}
            // The poked sticker wobbles; everything else settles calmly.
            transition={i === active ? poke : transition}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse" || suppressHover.current) return;
              setHovering(true);
              setActive(i);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse") return;
              setActive((current) => (current === i ? null : current));
            }}
            // Touch has no hover, so the press carries the poke: the sticker
            // recoils under the finger before the tap gathers the row.
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") return;
              setActive(i);
            }}
            onPointerUp={(e) => {
              if (e.pointerType === "mouse") return;
              setActive((current) => (current === i ? null : current));
            }}
            onPointerCancel={() => setActive(null)}
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
              width={512}
              height={Math.round(512 / sticker.aspect)}
              className="h-full w-full object-contain"
            />
          </motion.button>
        );
      })}
    </div>
  );
}
