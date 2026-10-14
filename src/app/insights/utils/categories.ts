import {
  CATEGORIES,
  CATEGORY_BLURBS,
  isCategory,
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

/** Label for a stored category; anything unread stays "Other". */
export const categoryLabel = (category: string | null) =>
  category && isCategory(category) ? CATEGORY_LABELS[category] : "Other";
