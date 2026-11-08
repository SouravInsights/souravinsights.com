"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

/**
 * The pile, back to front. The last one sits upright on top, so it is the
 * clearest face; the earlier two only ever show an edge.
 */
const DECK = [
  "/avatars/hat-sunglasses.png",
  "/avatars/peace.png",
  "/avatars/thinking.png",
];

const FRONT = DECK.length - 1;

/**
 * The control that flips between the whole row and shuffling one.
 *
 * The glyph is drawn as what a click will produce, so it agrees with the label:
 * a spread of the stickers beside "see all", a single one beside "just one".
 *
 * No frame. An earlier take put each sticker in a rounded tile with a ring and
 * a crop, which turned cut-outs into generic photo chips and made the overlap
 * read as debris. The stickers already carry their own white outline, which is
 * the separation — so the glyph is just the cut-outs, laid out.
 *
 * Two bits of motion, both literal: on mount it replays the change that just
 * happened (fanning when you spread the row, gathering when you collapsed it),
 * and on hover it does what the label says.
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
  const feedback = useFeedback();
  // Draw the promise, not the present: one is showing, so offer the spread.
  const spread = !expanded;

  // The first frame draws the opposite arrangement, then settles — a replay of
  // the change that just happened. Reduced motion removes the transition.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const drawn = settled ? spread : !spread;

  return (
    <button
      type="button"
      onClick={() => {
        feedback.select();
        onToggle();
      }}
      title={expanded ? "Gather into one" : "Spread them out"}
      className={cn(
        "group/toggle inline-flex cursor-pointer select-none items-center gap-2 rounded-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        drawn ? "[--spread:10px] [--turn:5deg]" : "[--spread:0px] [--turn:0deg]",
        spread && "hover:[--spread:12px] hover:[--turn:6deg]",
        className
      )}
    >
      <span
        className={cn(
          "relative h-8 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
          // Sized to the promise, so the label never drifts from the pile and
          // the button box never overflows its own content.
          spread ? "w-12" : "w-7",
          // "Just one": the sticker rises, the way you would lift one off a pile.
          !spread && "group-hover/toggle:-translate-y-0.5 group-hover/toggle:scale-[1.05]"
        )}
        aria-hidden="true"
      >
        {DECK.map((src, i) => (
          // Outer span pins each sticker to the centre and fades the ones that
          // are not part of the current arrangement; inner owns the fan.
          <span
            key={src}
            style={
              {
                "--k": String(i - (DECK.length - 1) / 2),
                "--r": String(i - FRONT),
                zIndex: i,
              } as CSSProperties
            }
            className={cn(
              "absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2",
              "transition-opacity duration-200 ease-out motion-reduce:transition-none",
              // Only the top sticker exists in the single arrangement, so the
              // ones behind fade out rather than hide under it and peek through.
              i < FRONT && (drawn ? "opacity-100" : "opacity-0")
            )}
          >
            <span
              className={cn(
                "block h-full w-full",
                "[transform:translateX(calc(var(--k)*var(--spread)))_rotate(calc(var(--r)*var(--turn)))]",
                "transition-transform duration-200 ease-out motion-reduce:transition-none"
              )}
            >
              <Image
                src={src}
                alt=""
                width={28}
                height={28}
                className="h-full w-full object-contain"
              />
            </span>
          </span>
        ))}
      </span>
      <span className="type-caption whitespace-nowrap text-muted-foreground underline-offset-4 transition-colors group-hover/toggle:text-foreground group-hover/toggle:underline">
        {expanded ? "gather" : "spread"}
      </span>
    </button>
  );
}
