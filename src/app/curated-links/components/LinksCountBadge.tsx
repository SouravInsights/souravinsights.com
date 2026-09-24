"use client";

import { useEffect, useState } from "react";
import Scritto from "@scritto/react";
import { cn } from "@/lib/utils";

/**
 * The count rolls up once the page header has settled, so its motion reads as
 * its own beat instead of happening inside the header's entrance. The pill
 * hides until then so the zero never flashes on screen.
 */
export function LinksCountBadge({ total }: { total: number }) {
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
      <span className="text-faint-foreground">links</span>
    </span>
  );
}