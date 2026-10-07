import generated from "@/content/insights-suggestions.json";

/**
 * The Ask panel's suggestion chips, derived from the collection by
 * `scripts/kb-suggestions.ts` — six per channel, so every category is covered
 * by construction instead of by someone remembering to cover it.
 *
 * One deliberate seam: if these ever need to refresh without a deploy, swap
 * this import for a Redis read and nothing else changes.
 */
export function getSuggestions(): string[] {
  return Object.values(generated as Record<string, string[]>).flat();
}
