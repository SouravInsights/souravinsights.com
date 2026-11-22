"use client";

import { MODES } from "@/components/quote/presets";

export function QuotePresetsDemo() {
  return (
    <div className="flex items-end gap-4">
      {MODES.map((mode) => (
        <div key={mode.id} className="flex flex-col items-center gap-2">
          <div
            className="rounded-lg border bg-card"
            style={{ width: 56, height: Math.round(56 * (mode.height / mode.width)) }}
          />
          <span className="text-xs text-muted-foreground">{mode.label}</span>
        </div>
      ))}
    </div>
  );
}
