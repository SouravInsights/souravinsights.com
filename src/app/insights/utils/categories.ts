import {
  CATEGORIES,
  CATEGORY_BLURBS,
  resolveCategory,
  type Category,
} from "@/lib/kb/categories";

export { CATEGORY_BLURBS };

/** Human labels for the categories, shared by the page, feeds and API docs. */
export const CATEGORY_LABELS: Record<Category, string> = {
  article: "Articles",
  publication: "Publications",
  people: "People",
  inspiration: "Inspiration",
  tool: "Tools",
  learning: "Learning",
  directory: "Directories",
  other: "Other",
};

export const CATEGORY_ORDER: Category[] = [...CATEGORIES];

/** Label for any stored value — v1 labels resolve to their v2 home. */
export const categoryLabel = (category: string | null) => {
  const resolved = resolveCategory(category);
  return resolved ? CATEGORY_LABELS[resolved] : "Other";
};
