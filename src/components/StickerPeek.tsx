"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

/**
 * Every sticker the shuffle draws from. Kept here so a new one is a single line.
 */
const STICKERS = [
  "/avatars/peace.png",
  "/avatars/thinking.png",
  "/avatars/messy-hair.png",
  "/avatars/hat-sunglasses.png",
  "/avatars/glasses-side.png",
  "/avatars/close-up.png",
  "/avatars/plaid-sunglasses.png",
];

/**
 * One sticker at a time, swapped on poke.
 *
 * All of them are rendered, stacked, and the swap is a crossfade — not a
 * remount. A single element that remounts per index has nothing on screen while
 * the next `next/image` optimises and decodes (a visible blank on mobile), and
 * only the first sticker would ever be warm. Stacked, every sticker is in the
 * viewport and loaded before it is asked for, and the outgoing one stays visible
 * until the incoming one is fully in.
 */
export function StickerPeek({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const feedback = useFeedback();

  const shuffle = useCallback(() => {
    feedback.select();
    // Never land back on the same sticker — a poke must visibly do something.
    setIndex(
      (current) =>
        (current + 1 + Math.floor(Math.random() * (STICKERS.length - 1))) %
        STICKERS.length
    );
  }, [feedback]);

  return (
    <button
      type="button"
      onClick={shuffle}
      aria-label="Show another sticker"
      className={cn(
        // Resting tilt, so it reads as a sticker rather than a floating image.
        "group relative block h-16 w-16 -rotate-[10deg] cursor-pointer select-none transition-transform duration-100 ease-out active:scale-95 sm:h-20 sm:w-20",
        className
      )}
    >
      {STICKERS.map((src, i) => {
        const active = i === index;
        return (
          <motion.div
            key={src}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{ zIndex: active ? 1 : 0 }}
            initial={false}
            animate={
              reduce
                ? { opacity: active ? 1 : 0 }
                : {
                    opacity: active ? 1 : 0,
                    scale: active ? 1 : 0.9,
                    rotate: active ? 0 : -8,
                  }
            }
            transition={
              reduce
                ? { duration: 0.15, ease: "easeOut" }
                : { type: "spring", duration: 0.5, bounce: 0.3 }
            }
          >
            <Image
              src={src}
              alt=""
              width={128}
              height={128}
              className="h-full w-full object-contain"
            />
          </motion.div>
        );
      })}
    </button>
  );
}
