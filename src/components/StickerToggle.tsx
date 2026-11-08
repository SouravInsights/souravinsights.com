"use client";

import { cn } from "@/lib/utils";

/**
 * The control that flips between showing the whole row and shuffling one.
 *
 * Deliberately not a button: a bordered icon floating in whitespace read as
 * browser chrome bolted onto the hero. This is a quiet caption that sits with
 * the stickers and says what it will do, so the wit lives in the words and the
 * control is anchored to the thing it changes.
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
        "type-caption cursor-pointer select-none text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline",
        className
      )}
    >
      {expanded ? "just one" : "see all"}
    </button>
  );
}
