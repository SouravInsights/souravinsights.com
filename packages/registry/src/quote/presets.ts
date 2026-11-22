/*
 * Quote card sizes and type presets.
 */

export type Mode = "post" | "story" | "square";
export type FontChoice = "serif" | "sans" | "mono";
export type SizeChoice = "small" | "medium" | "large";
export type AlignChoice = "left" | "center";
export type PositionChoice = "top" | "middle" | "bottom";

export const MODES: {
  id: Mode;
  label: string;
  width: number;
  height: number;
  /** what the size is for — the segmented control's tooltip */
  tip: string;
}[] = [
  {
    id: "post",
    label: "Post",
    width: 1080,
    height: 1350,
    tip: "4:5 · 1080 × 1350 · Feed, Threads, LinkedIn",
  },
  {
    id: "story",
    label: "Story",
    width: 1080,
    height: 1920,
    tip: "9:16 · 1080 × 1920 · Stories, Reels, TikTok",
  },
  {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
    tip: "1:1 · 1080 × 1080 · Feed, X, Bluesky",
  },
];

/* ------------------------------------------------------------------ text */

/** The site's own sans stack, read off the body so canvas matches the page. */
export function sansStack(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const family = getComputedStyle(document.body).fontFamily;
  return family || "system-ui, sans-serif";
}

export function fontStack(choice: FontChoice): string {
  if (choice === "sans") return sansStack();
  if (choice === "mono") return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  // The excerpt face.
  return "'New York', ui-serif, Georgia, 'Times New Roman', serif";
}
