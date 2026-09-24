"use client";

import { useEffect, useState } from "react";
import Scritto from "@scritto/react";

/**
 * Starts at zero, so the real total lands as an update and Scritto rolls the
 * count up to it — the number is the only thing animated.
 */
export function LinksCountBadge({ total }: { total: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(total);
  }, [total]);

  return (
    <Scritto
      value={value.toLocaleString()}
      className="font-medium text-foreground"
    />
  );
}