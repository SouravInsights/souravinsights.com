"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function UseReducedMotionDemo() {
  const reduce = useReducedMotion();

  return (
    <div className="rounded-xl border bg-card px-5 py-4 text-sm">
      <span className="text-muted-foreground">prefers-reduced-motion: </span>
      <span className="font-mono text-foreground">{String(reduce)}</span>
    </div>
  );
}
