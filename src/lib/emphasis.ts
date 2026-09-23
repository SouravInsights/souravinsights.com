/**
 * Recency hierarchy for a flat list: the first item carries the most weight and
 * each following item recedes a step, so a list reads top-down instead of every
 * row shouting at the same volume.
 *
 * Shared by the essay and link lists so the two columns stay in lockstep.
 */
const EMPHASIS_COLORS = [
  "text-foreground",
  "text-foreground/90",
  "text-foreground/80",
  "text-foreground/70",
  "text-foreground/60",
  "text-foreground/50",
];

export function emphasisClass(index: number): string {
  return EMPHASIS_COLORS[Math.min(index, EMPHASIS_COLORS.length - 1)];
}
