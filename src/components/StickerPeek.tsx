"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

/**
 * The stickers of me, kept here so a new one is a single line.
 */
const STICKERS = [
  { src: "/avatars/peace.png", alt: "" },
  { src: "/avatars/thinking.png", alt: "" },
  { src: "/avatars/messy-hair.png", alt: "" },
  { src: "/avatars/hat-sunglasses.png", alt: "" },
  { src: "/avatars/glasses-side.png", alt: "" },
];

/**
 * One sticker at a time, tucked behind the Macintosh and peeking out to its
 * left. Poking it swaps in a different one, so the set is never laid out and
 * the visitor has to discover it.
 *
 * The swap is a spring, not a transition: it is a playful, occasionally-pressed
 * thing, and the overshoot is the whole point. Reduced motion keeps the swap
 * (the state still has to change) but drops it to a crossfade.
 */
export function StickerPeek({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const feedback = useFeedback();

  const shuffle = useCallback(() => {
    feedback.select();
    setIndex((current) => {
      // Never land back on the same sticker — a click must visibly do something.
      const step = 1 + Math.floor(Math.random() * (STICKERS.length - 1));
      return (current + step) % STICKERS.length;
    });
  }, [feedback]);

  const sticker = STICKERS[index];

  return (
    <button
      type="button"
      onClick={shuffle}
      aria-label="Show another sticker"
      className={cn(
        // Resting tilt, so it reads as a sticker rather than a floating image.
        "group -rotate-[10deg] cursor-pointer select-none transition-transform duration-100 ease-out active:scale-95",
        className
      )}
    >
      <motion.div
        // Remounting on the new index replays the pop without an exit step, so
        // repeated pokes retarget instantly instead of queueing.
        key={index}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={
          reduce
            ? { duration: 0.15, ease: "easeOut" }
            : { type: "spring", duration: 0.5, bounce: 0.3 }
        }
      >
        <Image
          src={sticker.src}
          alt={sticker.alt}
          width={128}
          height={128}
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        />
      </motion.div>
    </button>
  );
}
