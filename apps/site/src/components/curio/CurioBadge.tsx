"use client";

import Link from "next/link";
import { Curio } from "./Curio";

/**
 * The badge a shared conversation signs itself with.
 *
 * A shared page is a public document with no other chrome, and this is the one
 * thing worth putting on it: the mark, and the way to ask a question of your own.
 * The label describes what pressing it does rather than claiming Curio made
 * something, because "made with" belongs to a builder and Curio answers.
 *
 * Fixed rather than placed in the flow, so it is reachable from anywhere in a
 * long answer without a footer to hold it. It sits above the shell's tab bar on
 * a phone.
 */
export function CurioBadge({
  label = "Ask Curio",
  href = "/curio",
}: {
  label?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      /* `max()` because the two cases differ: above a tab bar the band already
         includes the home indicator, and on a page without one the indicator is
         the only clearance, which 12px was not enough for. */
      className="fixed bottom-[calc(var(--tabbar-space)+max(1rem,env(safe-area-inset-bottom)))] right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 type-caption text-faint-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:bottom-6 sm:right-6"
    >
      <Curio size={18} />
      {label}
    </Link>
  );
}
