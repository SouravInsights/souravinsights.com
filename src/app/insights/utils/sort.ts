/**
 * How the collection can be ordered. One map, so the toolbar's button, the
 * command palette and any future surface never disagree about a label.
 */
export const SORT_LABELS = {
  newest: "Newest",
  oldest: "Oldest",
  liked: "Most liked",
  shuffle: "Shuffle",
} as const;

export type SortMode = keyof typeof SORT_LABELS;
