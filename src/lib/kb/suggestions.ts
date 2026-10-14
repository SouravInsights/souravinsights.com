import generated from "@/content/insights-suggestions.json";

/**
 * The Ask panel's suggestion questions, written by
 * `scripts/kb-suggestions.ts` — one pass over the whole collection, verified
 * against the index and truth-checked before shipping. Grouped by the category
 * each chip speaks for, with `wide` for questions that cross several.
 *
 * One deliberate seam: if these ever need to refresh without a deploy, swap
 * this import for a Redis read and nothing else changes.
 */
export function getSuggestions(): string[] {
  return Object.values(generated as Record<string, string[]>).flat();
}

/**
 * The same chips, still grouped — one key per category plus `wide` for the
 * questions that only work by crossing several. The review surface reads this
 * shape; the site flattens it.
 */
export function getSuggestionGroups(): Record<string, string[]> {
  return generated as Record<string, string[]>;
}
