"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Three of the stickers, reused at thumbnail size. The control shows the set it
 * controls, so it reads as part of the stickers rather than UI bolted on.
 */
const DECK = [
  "/avatars/peace.png",
  "/avatars/thinking.png",
  "/avatars/hat-sunglasses.png",
];

/**
 * The control that flips between the whole row and shuffling one.
 *
 * The glyph is a tiny stack of the stickers themselves: gathered when one is
 * showing, fanned when they are all out, and it leans toward the other shape on
 * hover. The word beside it says what a click will do, so the wit lives in the
 * copy and the shape, not in chrome.
 */
export function StickerToggle({
  expanded,
  onToggle,
  className,
}: {
  /** True when the row is spread out; the label then offers the opposite. */
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={expanded ? "Just one" : "See all"}
      className={cn(
        "group/toggle inline-flex cursor-pointer select-none items-center gap-2",
        className
      )}
    >
      <span className="relative h-5 w-9 shrink-0" aria-hidden="true">
        {DECK.map((src, i) => (
          <span
            key={src}
            style={{ left: `${i * (expanded ? 7 : 3)}px`, zIndex: i }}
            className={cn(
              "absolute top-1/2 block h-5 w-5 -translate-y-1/2 overflow-hidden rounded-[6px] bg-secondary ring-1 ring-black/10 transition-transform duration-200 ease-out dark:ring-white/10",
              // Lean toward the shape a click would produce.
              expanded
                ? "group-hover/toggle:-translate-x-0.5"
                : "group-hover/toggle:translate-x-1"
            )}
          >
            <Image
              src={src}
              alt=""
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </span>
        ))}
      </span>
      <span className="type-caption text-muted-foreground underline-offset-4 transition-colors group-hover/toggle:text-foreground group-hover/toggle:underline">
        {expanded ? "just one" : "see all"}
      </span>
    </button>
  );
}
