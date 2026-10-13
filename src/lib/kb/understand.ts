import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { pipelineModel } from "./model";
import { CATEGORIES, type Category } from "./categories";
import { applyTopicPolicy } from "./topics";
import {
  PROMPT_VERSION,
  DESCRIBE_PROMPTS,
  classifyPrompt,
  describePrompt,
} from "./prompts";

/**
 * understand — two model calls per link, two different jobs:
 *
 *   classify  what IS this page   → category + confidence
 *   describe  squeeze the page    → summary in the page's voice + its topics
 *
 * Topics live in describe, not classify: describe reads up to 6,000 words of
 * the page while classify only skims the first 1,500, and subjects are
 * easier to see in more text. Classify staying single-purpose also removes
 * the schema failures a chatty topic list used to cause.
 *
 * Evidence is bounded on purpose: classify gets the opening + heading
 * outline + counts (never a whole 1,200-item shelf); describe gets a
 * word-capped body. A low-confidence answer is an answer too: the link
 * lands in `other`, the review queue, instead of being guessed.
 *
 * Topics pass through the policy in topics.ts before anything is stored.
 * All prompt text lives in prompts.ts — bump PROMPT_VERSION on any edit.
 */

export { PROMPT_VERSION };

const MAX_SAMPLE_WORDS = 1500;
const MAX_HEADINGS = 30;
const MAX_DESCRIBE_WORDS = 6000;

const classificationSchema = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.enum(["high", "medium", "low"]),
});

const describeSchema = z.object({
  summary: z.string(),
  // No .max() here: the policy caps. A hard cap in the parse envelope turns
  // a chatty model into a whole-batch error class (learned with haiku-4.5).
  topics: z.array(z.string()),
});

export interface ClassifyResult {
  category: Category;
  confidence: "high" | "medium" | "low";
}

export interface DescribeResult {
  summary: string;
  topics: string[];
}

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

/**
 * classify — shared by the probe (the bake-off) and the production build,
 * so what gets measured is what ships.
 */
export async function classifyPage(
  model: LanguageModel,
  input: Omit<UnderstandInput, "author" | "published">
): Promise<ClassifyResult> {
  const sample = sampleOf(input.markdown);

  // The timeout exists so a stalled connection can't idle a worker forever;
  // 2 minutes is generous for a 6k-word prompt. generateText + Output.object
  // works across providers, unlike generateObject's json-schema mode
  // (OpenRouter rejects it for Anthropic models).
  const { output } = await generateText({
    model,
    abortSignal: AbortSignal.timeout(120_000),
    output: Output.object({ schema: classificationSchema }),
    prompt: classifyPrompt({
      url: input.url,
      title: input.title,
      description: input.description,
      site: input.site,
      sample: `${sample.outline}\n\nOpening:\n${sample.opening}`,
      stats: sample.stats,
    }),
  });
  if (!output) throw new Error("classify produced no structured output");
  return output;
}

/**
 * describe — summary + topics in one call, on the largest view of the page
 * we give any model. The model proposes topics; the policy decides them.
 */
export async function describePage(
  model: LanguageModel,
  input: Omit<UnderstandInput, "site"> & { category: Category }
): Promise<DescribeResult> {
  const { output } = await generateText({
    model,
    abortSignal: AbortSignal.timeout(120_000),
    output: Output.object({ schema: describeSchema }),
    prompt: describePrompt({
      url: input.url,
      title: input.title,
      author: input.author,
      published: input.published,
      category: input.category,
      instruction: DESCRIBE_PROMPTS[input.category],
      markdown: cap(input.markdown),
      knownTopics: input.knownTopics,
    }),
  });
  if (!output) throw new Error("describe produced no structured output");
  return {
    summary: output.summary.trim(),
    topics: applyTopicPolicy(output.topics),
  };
}

export async function understandPage(
  input: UnderstandInput
): Promise<UnderstandResult> {
  const { category: rawCategory, confidence } = await classifyPage(
    pipelineModel(),
    input
  );

  const category: Category = confidence === "low" ? "other" : rawCategory;

  const { summary, topics } = await describePage(pipelineModel(), {
    ...input,
    category,
  });

  return { category, topics, summary };
}
