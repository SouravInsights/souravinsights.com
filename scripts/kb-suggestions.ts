import "dotenv/config";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateObject } from "ai";
import { z } from "zod";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { chatModel } from "../src/lib/kb/model";
import { search } from "../src/lib/kb/search";
import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
} from "../src/app/curated-links/utils/channels";

/**
 * Derive the Ask panel's suggestion chips from the collection itself.
 *
 * Hand-writing them failed twice over: they drifted into title-echoes ("why
 * shipping beats polishing") that read as claims, and they only covered the
 * channels I happened to remember. Deriving per channel fixes both — coverage
 * is structural rather than a thing to keep remembering, and the model writes
 * a need instead of echoing a title.
 *
 * Usage: npx tsx scripts/kb-suggestions.ts
 */

/** Chips per channel. Every channel gets the same count, so none is louder. */
const PER_CHANNEL = 6;
/** How many of the most recent items to show the model as source material. */
const SAMPLE = 24;
/** A chip must retrieve at least this well from the real index to survive. */
const MIN_SCORE = 0.3;

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "content",
  "insights-suggestions.json"
);

const ChipSchema = z.object({
  questions: z
    .array(z.string())
    .describe("Questions a visitor might type, each 3-7 words"),
});

async function chipsFor(channel: string, items: string[]): Promise<string[]> {
  const { object } = await generateObject({
    model: chatModel(),
    schema: ChipSchema,
    system: [
      "You write the suggestion chips for a personal collection of saved links.",
      "Given real saved items, write short questions a visitor might actually",
      "type to find them.",
      "",
      "Rules:",
      "- A question, or a plain description of a need. Never a claim or slogan.",
      "  Bad: 'why shipping beats polishing'.",
      "  Good: 'when to stop perfecting and ship'.",
      "- Three to seven words. Plain words, not the source's jargon.",
      "- Never name a specific product or person ('what is Subframe', 'books by",
      "  Amit Varma'). Ask about the need the item serves instead.",
      "- Sentence case only, and no trailing question mark.",
      "- Vary the shape: some 'how to', some 'where to find', some noun phrases.",
      "- Only ask what these specific items can answer; invent nothing.",
    ].join("\n"),
    prompt:
      `Channel: ${CHANNEL_LABELS[channel] ?? channel}\n\n` +
      `Saved items:\n${items.join("\n")}\n\n` +
      `Write exactly ${PER_CHANNEL} questions.`,
  });
  return object.questions;
}

async function main() {
  const out: Record<string, string[]> = {};

  for (const channel of CHANNEL_ORDER) {
    const rows = await db
      .select({
        title: links.title,
        description: links.description,
        url: links.url,
      })
      .from(links)
      .where(
        and(
          eq(links.channel, channel),
          isNull(links.hiddenAt),
          ne(links.health, "dead")
        )
      )
      .orderBy(desc(links.addedAt))
      .limit(SAMPLE);

    const items = rows
      .filter((row) => row.title || row.description)
      .map(
        (row) =>
          `- ${row.title || row.url}${
            row.description ? ` — ${row.description.slice(0, 160)}` : ""
          }`
      );

    if (items.length === 0) {
      console.log(`${channel}: nothing to derive from, skipped`);
      continue;
    }

    const proposed = await chipsFor(channel, items);

    // Verify against the real index. A chip that pulls back nothing is worse
    // than a badly-worded one, so the generator drops its own dead output
    // rather than shipping it to the panel.
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const chip of proposed) {
      const [top] = await search(chip, { limit: 1 });
      if (top && top.score >= MIN_SCORE) kept.push(chip);
      else dropped.push(chip);
    }

    out[channel] = kept;
    console.log(`\n${channel} (from ${items.length} items)`);
    for (const chip of kept) console.log(`  ${chip}`);
    for (const chip of dropped) console.log(`  DROPPED, no good match: ${chip}`);
  }

  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  const total = Object.values(out).reduce((n, c) => n + c.length, 0);
  console.log(`\n${total} chips across ${Object.keys(out).length} channels`);
  console.log(`wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
