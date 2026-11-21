import type { ReactNode } from "react";

/**
 * The page-level sticky toolbar. One wrapper so every list page's bar has the
 * same height, padding and edge treatment — the insights list and the gallery
 * were drifting apart when each carried its own copy.
 */
export function StickyBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky-tabs -mx-5 flex items-center justify-between gap-3 bg-background px-5 py-3 sm:-mx-6 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
