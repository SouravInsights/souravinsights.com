import { generateObject, generateText } from "ai";
import { z } from "zod";
import { chatModel } from "./model";
import { CATEGORIES, type Category } from "./categories";
import {
  PROMPT_VERSION,
  DESCRIBE_PROMPTS,
  classifyPrompt,
  describePrompt,
} from "./prompts";

/**
 * understand — two model calls per link, two different jobs:
 *
 *   classify  what IS this page   → category + topics + confidence
 *   describe  squeeze the page    → a summary in the page's own voice
 *
 * The model never sees a whole giant shelf: classify gets a bounded sample
 * (opening words + heading outline + counts), describe gets a word-capped
 * markdown body. Low confidence lands in `other` — the review queue.
 *
 * All prompt text lives in prompts.ts. Bump PROMPT_VERSION on any prompt edit.
 */

export { PROMPT_VERSION };

const MAX_SAMPLE_WORDS = 1500;
const MAX_HEADINGS = 30;
const MAX_DESCRIBE_WORDS = 6000;

const classificationSchema = z.object({
  category: z.enum(CATEGORIES),
  topics: z.array(z.string()).max(7),
  confidence: z.enum(["high", "medium", "low"]),
});

export interface UnderstandInput {
  url: string;
  title: string;
  description: string;
  site: string;
  author: string;
  published: string;
  markdown: string;
  /** Topics already in use across the collection — the vocabulary leash. */
  knownTopics: string[];
}

export interface UnderstandResult {
  category: Category;
  topics: string[];
  summary: string;
}

/** The bounded evidence classify sees — never a whole 1,200-item shelf. */
function sampleOf(markdown: string) {
  const words = markdown.split(/\s+/).filter(Boolean);
  const headingOutline = markdown
    .split("\n")
    .filter((line) => /^#{1,6}\s/.test(line))
    .slice(0, MAX_HEADINGS)
    .join("\n");
  const links = (markdown.match(/\]\(/g) ?? []).length;
  const images = (markdown.match(/!\[/g) ?? []).length;

  return {
    opening: words.slice(0, MAX_SAMPLE_WORDS).join(" "),
    outline: headingOutline || "(no headings)",
    stats: `${words.length} words · ${links} links · ${images} images in the markdown`,
  };
}

const cap = (markdown: string) =>
  markdown.split(/\s+/).filter(Boolean).slice(0, MAX_DESCRIBE_WORDS).join(" ");

export async function understandPage(
  input: UnderstandInput
): Promise<UnderstandResult> {
  const sample = sampleOf(input.markdown);

  const { object } = await generateObject({
    model: chatModel(),
    schema: classificationSchema,
    prompt: classifyPrompt({
      url: input.url,
      title: input.title,
      description: input.description,
      site: input.site,
      sample: `${sample.outline}\n\nOpening:\n${sample.opening}`,
      stats: sample.stats,
      knownTopics: input.knownTopics,
      categories: CATEGORIES,
    }),
  });

  // Low confidence is an answer too: it files the link for human review.
  const category: Category =
    object.confidence === "low" ? "other" : object.category;

  const { text } = await generateText({
    model: chatModel(),
    prompt: describePrompt({
      url: input.url,
      title: input.title,
      author: input.author,
      published: input.published,
      category,
      instruction: DESCRIBE_PROMPTS[category],
      markdown: cap(input.markdown),
    }),
  });

  return {
    category,
    topics: object.topics.map((t) => t.toLowerCase().trim()),
    summary: text.trim(),
  };
}
