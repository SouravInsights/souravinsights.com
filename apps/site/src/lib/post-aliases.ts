import aliases from "@/content/post-aliases.json";

/**
 * Blog posts may be renamed, but their stats (views, likes) live in Redis under
 * the slug. Renaming the file orphaned every key, so the new slug started at
 * zero. This map is the single record of renames: the redirect in
 * `next.config.mjs` and the stats routes both read it, so a renamed post still
 * answers on its old URL and still reads its old keys.
 *
 * Generated from git's rename history by `scripts/generate-post-aliases.mjs`
 * before every dev server and build. Rename a post and push; nothing to edit.
 */
const aliasMap = aliases as Record<string, string>;

/** Follow a rename chain to the slug the file has today. */
export function resolvePostSlug(slug: string): string {
  let current = slug;
  const seen = new Set<string>();

  while (aliasMap[current] && !seen.has(current)) {
    seen.add(current);
    current = aliasMap[current];
  }

  return current;
}

/**
 * Every slug that ever named this post, current first. Stats are summed across
 * all of them so a rename never hides the history. Writes go to the first.
 */
export function getPostSlugsForStats(slug: string): string[] {
  const canonical = resolvePostSlug(slug);
  const slugs = [canonical];

  for (const oldSlug of Object.keys(aliasMap)) {
    if (resolvePostSlug(oldSlug) === canonical) slugs.push(oldSlug);
  }

  return Array.from(new Set(slugs));
}
