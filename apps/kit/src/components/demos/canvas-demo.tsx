"use client";

import { Canvas } from "@/components/ui/canvas";

export function CanvasDemo() {
  return (
    <Canvas
      width={320}
      height={200}
      className="h-40 w-64 rounded-xl"
      aria-label="Canvas gradient"
      draw={(ctx, { width, height }) => {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#f4e58a");
        gradient.addColorStop(0.5, "#8fc4e3");
        gradient.addColorStop(1, "#b3a4f0");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }}
    />
  );
}
