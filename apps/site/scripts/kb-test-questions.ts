import "./load-env";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateObject } from "ai";
import { z } from "zod";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { suggestionModel } from "../src/lib/kb/model";
import { CATEGORIES, CATEGORY_DEFS } from "../src/lib/kb/categories";

/**
 * kb-test-questions — a long list of questions to type into a deployment.
 *
 *   npx tsx scripts/kb-test-questions.ts
 *
 * Written against the real saved links, so every question has a home in the
 * collection; the mix spans single pages, sets of pages that share a subject,
 * comparisons, questions about the collection itself, and questions the
 * collection does NOT cover (a good answer says so rather than inventing).
 *
 * The file is just questions, grouped by category — no answers, no keys, no
 * verdicts, because those would be my guesses about what a good answer is and
 * guesses are what you are testing for.
 *
 * Written to eval/test-questions.json.
 */

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "eval",
  "test-questions.json"
);

/** Links sampled per category, newest first, to write questions from. */
const SAMPLE_PER_CATEGORY = 14;
/** Characters of each sampled link's summary given to the writer. */
const SUMMARY_CHARS = 260;
/** Questions asked per category. */
const PER_CATEGORY = 16;

const QuestionSchema = z.object({
  questions: z.array(
    z.string().describe("One question, as a visitor would type it")
  ),
});

const SYSTEM = [
  "You write questions a visitor would type into a search assistant over a",
  "personal collection of saved links. They are typed by hand into the deployed",
  "app and the answers read, so they must be natural and worth asking.",
  "",
  "Mix these, roughly evenly:",
  "- a question one listed page answers (ask for something specific it says);",
  "- a question several listed pages answer between them;",
  "- a comparison between two listed pages that overlap;",
  "- a question about a precise claim (a number, a name, a price);",
  "- a question the listed pages do NOT cover but a visitor would plausibly",
  "  ask anyway — the honest answer is 'not in the collection'.",
  "",
  "Rules:",
  "- Plain, natural questions. No jargon, no marketing language.",
  "- Ground every question in the listed material; ask about nothing outside it.",
  "- Vary shape and length: some short, some with a qualifier ('for a small",
  "  team', 'on mobile', 'without a subscription').",
  "- Questions only. No answers, no hints, no expected results.",
].join("\n");

interface Item {
  urlKey: string;
  title: string;
  summary: string | null;
  topics: string[] | null;
}

async function main() {
  const rows = await db
    .select({
      urlKey: links.urlKey,
      title: links.title,
      category: links.category,
      topics: links.topics,
      summary: linkChunks.content,
    })
    .from(links)
    .leftJoin(
      linkChunks,
      and(eq(linkChunks.linkId, links.id), eq(linkChunks.chunkIndex, 0))
    )
    .where(and(isNull(links.hiddenAt), ne(links.health, "dead")));

  const groups: Record<string, string[]> = {};

  for (const category of CATEGORIES) {
    const items: Item[] = rows
      .filter((row) => row.category === category)
      .slice(0, SAMPLE_PER_CATEGORY)
      .map((row) => ({
        urlKey: row.urlKey,
        title: row.title || row.urlKey,
        summary: row.summary,
        topics: row.topics,
      }));
    if (items.length < 4) continue;

    const material = items
      .map(
        (item) =>
          `- key: ${item.urlKey}\n  title: ${item.title}` +
          (item.topics?.length ? `\n  topics: ${item.topics.join(", ")}` : "") +
          (item.summary
            ? `\n  summary: ${item.summary.replace(/\s+/g, " ").slice(0, SUMMARY_CHARS)}`
            : "")
      )
      .join("\n");

    const { object } = await generateObject({
      model: suggestionModel(),
      schema: QuestionSchema,
      system: SYSTEM,
      prompt:
        `Category: ${category} — ${CATEGORY_DEFS[category].blurb}\n\n` +
        `Saved links in this category:\n${material}\n\n` +
        `Write ${PER_CATEGORY} questions.`,
    });

    groups[category] = object.questions;
    console.log(`${category}: ${object.questions.length} questions`);
  }

  // Questions about the collection as a whole, written once.
  const allTitles = rows.map((row) => `- ${row.title || row.urlKey}`).join("\n");
  const { object: metaObject } = await generateObject({
    model: suggestionModel(),
    schema: QuestionSchema,
    system: SYSTEM,
    prompt:
      `The whole collection (titles only):\n${allTitles}\n\n` +
      `Write 12 questions about the collection itself — its shape, the kinds of` +
      ` things it holds, what it covers well, where it is thin.`,
  });
  groups.collection = metaObject.questions;
  console.log(`collection: ${metaObject.questions.length} questions`);

  const total = Object.values(groups).flat().length;
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total,
        groups,
      },
      null,
      2
    )}\n`
  );
  console.log(`\n${total} questions → ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
