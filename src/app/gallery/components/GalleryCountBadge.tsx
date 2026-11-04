"use client";

import { useEffect, useState } from "react";
import Scritto from "@scritto/react";
import { cn } from "@/lib/utils";

/**
 * The clip count in the header. Same beat as the insights badge: it rolls once
 * the header has settled, and stays hidden until then so no zero ever flashes.
 */
export function GalleryCountBadge({ total }: { total: number }) {
  const [value, setValue] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setReady(true);
      setValue(total);
    }, 350);
    return () => clearTimeout(timeout);
  }, [total]);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 type-caption tabular-nums transition-opacity duration-150",
        ready ? "opacity-100" : "opacity-0"
      )}
    >
      <Scritto
        value={value.toLocaleString()}
        className="font-medium text-foreground"
      />
      <span className="text-faint-foreground">
        {total === 1 ? "clip" : "clips"}
      </span>
    </span>
  );
}
