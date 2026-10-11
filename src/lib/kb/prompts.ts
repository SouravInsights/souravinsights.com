import type { Category } from "./categories";

/**
 * Every word of prompt text the understand stage speaks, in one file — prompts
 * are the thing a person adjusts most, so they sit where they can be reviewed
 * at a glance. Bump PROMPT_VERSION on any edit: rows carry their version so a
 * re-run can target only the stale ones.
 */

export const PROMPT_VERSION = 1;

/**
 * The one rule every prompt follows (docs/spec/insights-rebuild.md): the page's
 * own voice wins, and nothing enters a summary that isn't on the page.
 */
export const VOICE_RULE = `Rules you must follow:
- Use the site's own words and tone. Quote a line when it's good. Never flatten it into bland AI-speak.
- Write nothing that isn't on the page: no guessed pricing, no inferred topics, no "this site could help you…". If it's not on the page, it's not in the summary.
- Two sentences, at most three. Plain.`;

/** What classify answers: what IS this page. Not what it's about — its topics. */
export const classifyPrompt = (input: {
  url: string;
  title: string;
  description: string;
  site: string;
  sample: string;
  stats: string;
  knownTopics: string[];
  categories: readonly string[];
}) => `You are labeling one saved web page for a personal curated-links collection.

Pick its category from this list (nothing else is allowed):
- article — one long-form piece of writing
- blog — an ongoing place of writing (solo or magazine)
- tool — a thing you use: app, SaaS, library, CLI
- learning — a course, book, or tutorial site
- gallery — a site to look at for inspiration
- directory — a list whose value is pointing elsewhere
- portfolio — a person or studio's own site
- newsletter — a subscription page
- other — you cannot place it confidently

The shape can mislead: an essay citing many sources is still an article; a
directory reads like prose but its items only point elsewhere. Judge what the
page exists to do.

Page:
URL: ${input.url}
Title: ${input.title}
Meta description from the site: ${input.description || "(none)"}
Site name: ${input.site || "(none)"}
${input.stats}

Heading outline:
${input.sample}

Also give 3-7 topic keywords (short lowercase words: motion, typography, agents, pricing…).
${input.knownTopics.length ? `Reuse these where they fit: ${input.knownTopics.join(", ")}.` : ""}`;

/** What describe answers, per category: squeeze the single page for summary. */
export const DESCRIBE_PROMPTS: Record<Category, string> = {
  article:
    "Capture the thesis and the key claims — the argument, not the wrapper.",
  tool: "Capture what it does, who it is for, and its pricing or free tier or open-source status if shown.",
  learning:
    "Capture what it teaches, its structure or table of contents if present, and any FAQ or price nuggets. If the page is thin, the summary says so honestly.",
  portfolio:
    "Capture who this person is, what they do, their notable work, and their socials or contact if shown.",
  blog: "Capture what the place is, what kind of writing it collects, and what a reader gets from browsing it.",
  gallery:
    "Capture what the place is, what kind of work it showcases, and what a visitor gets from looking.",
  directory:
    "Capture what the place is and what kind of destinations it points to.",
  newsletter:
    "Capture what it covers, how often it comes out, and who writes it.",
  other: "Describe what this page is and what it offers.",
};

export const describePrompt = (input: {
  url: string;
  title: string;
  author: string;
  published: string;
  category: Category;
  instruction: string;
  markdown: string;
}) => `Summarize this page in the site's own voice.

It is a "${input.category}". ${input.instruction}

${VOICE_RULE}

Page: ${input.url}
Title: ${input.title}
${input.author ? `Author: ${input.author}` : ""}
${input.published ? `Published: ${input.published}` : ""}

Markdown of the page:
"""
${input.markdown}
"""`;
