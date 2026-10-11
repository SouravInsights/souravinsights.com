import { CATEGORIES, type Category } from "@/lib/kb/categories";

/** Human labels for the categories, shared by the page, feeds and API docs. */
export const CATEGORY_LABELS: Record<Category, string> = {
  article: "Articles",
  blog: "Blogs",
  tool: "Tools",
  learning: "Learning",
  gallery: "Galleries",
  directory: "Directories",
  portfolio: "Portfolios",
  newsletter: "Newsletters",
  other: "Other",
};

export const CATEGORY_ORDER: Category[] = [...CATEGORIES];

export const categoryLabel = (category: string | null) =>
  category && category in CATEGORY_LABELS
    ? CATEGORY_LABELS[category as Category]
    : "Other";
