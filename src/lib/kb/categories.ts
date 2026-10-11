/**
 * The nine categories a link can be (docs/spec/insights-rebuild.md). One label
 * per link, assigned by the understand stage. This file is the code-of-record —
 * when the list changes after the describe pass, it changes here.
 */

export const CATEGORIES = [
  "article",
  "blog",
  "tool",
  "learning",
  "gallery",
  "directory",
  "portfolio",
  "newsletter",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value);
