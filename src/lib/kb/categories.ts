/**
 * The eight categories a link can be — the code-of-record for the taxonomy,
 * including the exact wording of each definition. CATEGORY_DEFS is the single
 * source of truth: the classify prompt builds its category list from it, so a
 * definition change happens here, once (with a PROMPT_VERSION bump).
 * The decision log: docs/review/categorization-feedback.md §7.
 *
 * Three rules decide any page:
 *
 * 1. JUDGE THE PAGE, NOT THE PLACE IT LIVES. Container words ("/blog/" in
 *    the URL, a date slug, "The Blog of X" in the title) describe the shelf,
 *    not the page.
 *
 * 2. PURPOSE BEATS PACKAGING. What does the visitor come to DO — read one
 *    piece, follow an outlet, meet one person, look, learn, use, leave via
 *    links? Paid vs free never decides: a paid showcase is still inspiration,
 *    a paid course is still learning, a paid product is still a tool.
 *
 * 3. IDENTITY BY NAME, MECHANICS BY EVIDENCE. A site named after its author
 *    is people. A site with an editorial name of its own is judged by
 *    mechanics: publishing original work or curating with commentary is a
 *    publication; aggregating other people's posts (votes, feeds, link
 *    lists) is a directory.
 *
 * History: v1's nine labels mixed page-types ("article" = what a page IS)
 * with place-types ("blog" = what a place IS), and posts got labelled by
 * their container — 80% of the blog bucket was wrong. A "product" split was
 * tried and reverted the same way: v1's tool bucket had zero flagged errors,
 * and paid vs free is not a boundary a classifier can hold.
 */

export const CATEGORIES = [
  "article",
  "publication",
  "people",
  "tool",
  "learning",
  "inspiration",
  "directory",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The canonical wording of each category — what the classify prompt speaks. */
export const CATEGORY_DEFS: Record<Category, string> = {
  article:
    "one piece of writing: an essay, post, guide or case study, wherever it lives",
  publication:
    "an editorial outlet that publishes many pieces: a magazine, journal, or curated newsletter",
  people:
    "one person's own site: homepage, about page, or the index of their own writing and work. A personal homepage is people even when short, or when it mostly lists the person's latest posts. A single piece of their writing is an article, never people.",
  tool: "what remains that you use directly: library, CLI, app, SaaS, a company's product, a data platform you query. Free or paid is irrelevant. Use tool only when the visit is to get or work with the thing itself — if the visit is to look or to learn, those categories win even when the thing is paid, a SaaS, or an app.",
  learning:
    "structured teaching: a course, book, curriculum, or reference, including paid indie courses. A course's landing or sales page is still learning — judge the material it represents. One piece of writing that teaches is an article.",
  inspiration:
    "a showcase to look at: design galleries, collections of sites, screens, illustrations, workspaces. A paid showcase is still inspiration.",
  directory:
    "a list whose value is pointing elsewhere: blogrolls, link collections, a person's stash of books or resources. A database, registry or dataset you query is a tool, not a directory — its value is the data, not the links out.",
  other: "you cannot place it confidently",
};

/** The list the classify prompt speaks, generated from CATEGORY_DEFS. */
export const CATEGORY_PROMPT_LIST = CATEGORIES.map(
  (c) => `- ${c} — ${CATEGORY_DEFS[c]}`
).join("\n");

export const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value);

/**
 * Rows classified under taxonomy v1 carry these labels. Map at read time so
 * old rows display sanely until the reclassify pass rewrites them.
 */
export const LEGACY_CATEGORY: Record<string, Category> = {
  blog: "publication",
  newsletter: "publication",
  portfolio: "people",
  gallery: "inspiration",
};

/** Resolve any stored label — v1 or v2 — to a v2 category, or null. */
export const resolveCategory = (value: string | null): Category | null => {
  if (!value) return null;
  if (isCategory(value)) return value;
  return LEGACY_CATEGORY[value] ?? null;
};
