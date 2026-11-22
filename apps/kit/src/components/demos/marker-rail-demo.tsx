"use client";

import { MarkerRail } from "@/components/ui/marker-rail";

export function MarkerRailDemo() {
  return (
    <div className="relative h-64 w-64">
      <MarkerRail
        markers={[
          { id: 1, at: 0.1, color: "#f4e58a", label: "The best interfaces disappear." },
          { id: 2, at: 0.45, color: "#8fe3b8", label: "Selection snaps to whole words." },
          { id: 3, at: 0.8, color: "#f0a4c8", label: "Share a quote as an image." },
        ]}
        onSelect={() => undefined}
        ariaLabel="Highlights: 3"
        className="absolute right-0 top-1/2 -translate-y-1/2"
      />
    </div>
  );
}
