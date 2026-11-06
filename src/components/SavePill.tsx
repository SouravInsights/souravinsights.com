"use client";

import { Check, CircleNotch } from "@phosphor-icons/react";

export type SaveState = "idle" | "saving" | "saved";

/**
 * The page-level save indicator, as a floating pill.
 *
 * It clears the shell's tab bar on phones by reading the same `--tabbar-space`
 * the frame owns. Projects settled this position: centred, just above the bar,
 * where a save is seen without covering what you are reading. Every page uses
 * it — no page gets its own height for the same job.
 */
export function SavePill({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <div className="fixed bottom-[calc(var(--tabbar-space,0px)+1.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 shadow-[0_0_15px_rgba(0,0,0,0.1)] backdrop-blur-md">
      {state === "saving" ? (
        <>
          <CircleNotch className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Saving…
          </span>
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-green-700 dark:text-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-500">
            Saved
          </span>
        </>
      )}
    </div>
  );
}
