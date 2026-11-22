"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAR, STAGGER } from "@/components/highlight/wave";

export function HighlightWaveDemo() {
  const [play, setPlay] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!play) return;
    setActive(true);
    const total = CHAR + STAGGER * 14;
    const timer = window.setTimeout(() => setActive(false), total);
    return () => window.clearTimeout(timer);
  }, [play]);

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-2xl tracking-tight">
        {"disappear".split("").map((char, index) => (
          <span
            key={index}
            className="inline-block transition-transform duration-200"
            style={{
              transform: active ? "translateY(-6px)" : "none",
              transitionDelay: `${index * STAGGER}ms`,
              transitionDuration: `${CHAR}ms`,
            }}
          >
            {char}
          </span>
        ))}
      </p>
      <Button variant="outline" size="sm" onClick={() => setPlay((n) => n + 1)}>
        Play wave
      </Button>
    </div>
  );
}
