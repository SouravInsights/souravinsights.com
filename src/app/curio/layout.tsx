import React from "react";

/**
 * The app-shell band for Curio's screen.
 *
 * The navbar is a fixed overlay rather than a band in the flow, so a screen that
 * wants the top edge below it has to reserve it itself.
 *
 * The mobile number is 4.25rem, not the 4rem Shipstack reserves: the pill is
 * `top-4` (1rem) + `h-9` (2.25rem) + `p-1.5` twice (0.75rem) + its 2px of border
 * — 4rem and 2px — so 4rem leaves a screen's own header two pixels under it.
 * Shipstack never showed that because `.play-root` pads a safe-area inset inside
 * itself; Curio has no such pad, so the band is honest here instead. Everything
 * is in rem, so the band and the pill scale together if a reader's root font
 * size is not 16px.
 *
 * Nothing here hides the navbar: Curio is a page on this site, and the way to
 * every other page has to stay where it is. The screen's own height subtracts
 * exactly this pair (CurioHome) — change one and the app stops landing on the
 * viewport.
 */
export default function CurioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-[4.25rem] md:pt-20">{children}</div>;
}
