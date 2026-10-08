import "dotenv/config";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateObject } from "ai";
import { z } from "zod";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { suggestionModel } from "../src/lib/kb/model";
import { search } from "../src/lib/kb/search";
import { mapWithConcurrency } from "../src/lib/links/health";
import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
} from "../src/app/insights/utils/channels";

/**
 * Derive the Ask panel's suggestion chips from the collection itself.
 *
 * Two failures got us here, and the rules below are the scars from both:
 *
 *   1. Hand-written chips drifted into title-echoes ("why shipping beats
 *      polishing") and covered only the channels I happened to remember.
 *      Fixed by deriving per channel — coverage became structural.
 *   2. Derived-from-titles chips fixed coverage and lost all substance. The
 *      model saw a title, 160 characters of description, and a rule reading
 *      "never name a specific product or person" — so every chip became a
 *      topic: "updates on React Native development", "where to explore
 *      creative workspaces". True, answerable, and nothing anyone clicks.
 *
 * The fix is three changes, each aimed at one of those causes: the model now
 * reads the *lead passage* we actually stored (substance exists in the
 * collection, not in the titles), it must name the concrete thing and say which
 * item it is about, and the empty shapes are refused by code.
 *
 * Usage: npx tsx scripts/kb-suggestions.ts
 */

/**
 * Chips per channel. Hand-set, neither equal nor proportional: reading-list and
 * resources are where the essays are (98 and 90 links against newsletters' 31),
 * so they carry the shelf; the rest are single-item channels — a tool, a
 * portfolio, a newsletter — where a handful of hooks is the whole story.
 */
const QUOTA: Record<string, number> = {
  "reading-list": 20,
  resources: 16,
  tools: 8,
  "product-hunt": 8,
  "fav-portfolios": 6,
  "design-inspo": 5,
  newsletters: 5,
};
/** Any channel missing from QUOTA. */
const DEFAULT_QUOTA = 6;
/** Asked for beyond the quota, so a rejected candidate leaves no hole. */
const slackFor = (quota: number) => Math.max(6, Math.ceil(quota / 2));
/** Source material per channel: enough items that chips can be spread thin. */
const itemsFor = (quota: number) => Math.max(20, quota * 2);
/** How many candidates are checked against the index at once. */
const VERIFY_CONCURRENCY = 4;
/** Characters of the item's own opening passage to hand the model. */
const LEAD_CHARS = 200;
/** A chip must clear the readability cutoff the eval measured (`kb-eval.ts`). */
const MIN_SCORE = 0.35;
/** The item a chip claims to be about must retrieve from the chip itself. */
const GROUNDING_RANK = 3;

/**
 * The empty shapes the old prompt produced, in the words it produced them in.
 * This lives in code rather than as one more prompt line because the prompt is
 * what failed: a rule the model can ignore is not a gate.
 */
const EMPTY_SHAPES =
  /^(updates? on|where to (find|explore|learn|get|discover)|best .{0,40} for|what is trending|how to (improve|learn|boost|master|get better))/i;

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "content",
  "insights-suggestions.json"
);

const ChipSchema = z.object({
  chips: z.array(
    z.object({
      question: z
        .string()
        .describe("4-12 words, sentence case, no trailing question mark"),
      about: z
        .string()
        .describe(
          "The exact title of the saved item this chip is about, copied from the list"
        ),
    })
  ),
});

const SYSTEM = [
  "You write the suggestion chips for a personal collection of saved links —",
  "the buttons a visitor clicks when they do not yet know what to search for.",
  "A chip is a hook. The visitor has not read any of these pages, and does not",
  "care which ones exist.",
  "",
  "Rules:",
  "- Ground every chip in ONE item from the list, and copy that item's exact",
  "  title into `about`.",
  "- Ask about the SUBJECT, never about the page or its author. A chip about the",
  "  item itself reads like a librarian, and nobody clicks it: 'the focus of",
  "  Learn Inference', 'what Marv writes about', 'what topics are covered in",
  "  interface typography'.",
  "- Never ask about a person, a publication, or its audience. Biography and",
  "  coverage chips are not hooks: 'what Jakub Krehel does as a design",
  "  engineer', 'what Waqas Ali writes about', 'which engineers trust this",
  "  briefing'. Ask about the craft, the decision or the technique instead.",
  "- Ask about something the item actually says that the visitor does not already",
  "  know: a decision, a number, a mechanism, a tradeoff, a mistake, a",
  "  comparison.",
  "- Name the concrete thing: a tool, project, company, person or number taken",
  "  from that item. A chip with no name in it is a topic, and a topic is what",
  "  nobody clicks.",
  "- 4 to 12 words. Sentence case. No trailing question mark. Plain words.",
  "- One clause: no colon-splits, no 'X and Y' constructions.",
  "- Never a claim, a slogan or a prediction. No 'why shipping beats polishing'",
  "  and no 'what UX behaviours will reshape design in 2025'.",
  "- Never these empty shapes: 'updates on X', 'where to find X', 'best X for",
  "  Y', 'what is trending in X', 'how to improve X'.",
  "- Vary the shape: at most two chips may open with the same two words, and at",
  "  least one should name a person or a company.",
  "- Ask only what the listed items can answer. Invent nothing.",
  "",
  "The difference, in this collection's voice. These lines are illustrations,",
  "never answers — do not reuse one:",
  "- BAD 'updates on React Native development'",
  "  GOOD 'what Shopify learned rewriting React Native'",
  "- BAD 'how do query engines work'",
  "  GOOD 'when a query planner picks the wrong index'",
  "- BAD 'what is trending in UX design'",
  "  GOOD 'how The Pudding turns numbers into a scrollytelling essay'",
  "- BAD 'best books for creative professionals'",
  "  GOOD 'why Steve Jobs wrote letters to strangers'",
].join("\n");

/**
 * The panel's chips are sentence case; the model capitalises its first word.
 * Only the question openers are touched, so a chip starting with "GitHub…" or
 * "GPT-2…" keeps its capitals.
 */
const OPENERS =
  /^(How|What|Why|Which|Where|When|Who|Whose|Does|Do|Is|Are|Can|Should|Would|Will|Did|The|A|An)\b/;
const sentenceCase = (chip: string): string =>
  chip.replace(OPENERS, (word) => word.toLowerCase());

interface Item {
  title: string;
  url: string;
  description: string | null;
  lead: string | null;
}

/**
 * Which item a chip is about. Exact title first, then a prefix match in either
 * direction — the model sometimes truncates a long title (with an ellipsis) or
 * shortens it, and a good chip should not die over that.
 */
function sourceFor(about: string, items: Item[]): Item | undefined {
  const wanted = about.trim().replace(/[.…\s]+$/, "").toLowerCase();
  if (!wanted) return undefined;
  return (
    items.find((item) => item.title.toLowerCase() === wanted) ??
    items.find(
      (item) =>
        item.title.toLowerCase().startsWith(wanted) ||
        wanted.startsWith(item.title.toLowerCase())
    )
  );
}

async function chipsFor(channel: string, items: Item[], count: number) {
  const material = items
    .map((item) => {
      const lead = (item.lead ?? "").replace(/\s+/g, " ").slice(0, LEAD_CHARS);
      const description = item.description?.slice(0, 120) ?? "";
      return [
        `- ${item.title}`,
        `  url: ${item.url}`,
        description ? `  note: ${description}` : null,
        lead ? `  opening: ${lead}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const { object } = await generateObject({
    model: suggestionModel(),
    schema: ChipSchema,
    system: SYSTEM,
    prompt:
      `Channel: ${CHANNEL_LABELS[channel] ?? channel}\n\n` +
      `Saved items:\n${material}\n\n` +
      `Write exactly ${count} chips.`,
  });
  return object.chips;
}

interface Kept {
  question: string;
  url: string;
}

interface Verdict {
  question: string;
  source?: Item;
  /** Why it can't ship. Absent means it passed everything but the quota. */
  reason?: string;
}

async function main() {
  const out: Record<string, string[]> = {};

  for (const channel of CHANNEL_ORDER) {
    const quota = QUOTA[channel] ?? DEFAULT_QUOTA;

    const rows = await db
      .select({
        title: links.title,
        url: links.url,
        description: links.description,
        lead: linkChunks.content,
      })
      .from(links)
      .leftJoin(
        linkChunks,
        and(eq(linkChunks.linkId, links.id), eq(linkChunks.chunkIndex, 0))
      )
      .where(
        and(
          eq(links.channel, channel),
          isNull(links.hiddenAt),
          ne(links.health, "dead")
        )
      )
      .orderBy(desc(links.addedAt))
      .limit(itemsFor(quota));

    // A link with no title is a URL we can still ground a chip in.
    const items: Item[] = rows.map((row) => ({
      title: row.title || row.url,
      url: row.url,
      description: row.description,
      lead: row.lead,
    }));

    if (items.length === 0) {
      console.log(`${channel}: nothing to derive from, skipped`);
      continue;
    }

    const proposed = await chipsFor(channel, items, quota + slackFor(quota));

    // Every check that needs the index, in parallel and in the model's order.
    // The cheap ones run first, so a refused chip never costs an embedding.
    const verdicts = await mapWithConcurrency(
      proposed,
      VERIFY_CONCURRENCY,
      async (chip): Promise<Verdict> => {
        const question = sentenceCase(chip.question.trim());
        if (EMPTY_SHAPES.test(question)) {
          return { question, reason: "empty shape" };
        }
        const source = sourceFor(chip.about, items);
        if (!source) {
          return { question, reason: `about named nothing we sent: ${chip.about}` };
        }
        // The chip is a promise that this collection can answer it, and that it
        // is about the item it claims. Both are checkable, so both are checked.
        const hits = await search(question, { limit: GROUNDING_RANK });
        const top = hits[0];
        if (!top || top.score < MIN_SCORE) {
          return {
            question,
            source,
            reason: `no match in the index (${top?.score.toFixed(3) ?? "none"})`,
          };
        }
        if (!hits.some((hit) => hit.url === source.url)) {
          return { question, source, reason: "its own item doesn't surface" };
        }
        return { question, source };
      }
    );

    // Then keep them in that order: one chip per item, no repeats, up to quota.
    const kept: Kept[] = [];
    const dropped: string[] = [];
    const used = new Set<string>();
    const seen = new Set<string>();

    for (const verdict of verdicts) {
      let reason = verdict.reason ?? null;
      if (!reason && verdict.source && used.has(verdict.source.url)) {
        reason = "same item as a chip we kept";
      }
      if (!reason && seen.has(verdict.question.toLowerCase())) {
        reason = "a repeat";
      }
      if (!reason && kept.length >= quota) reason = "over the quota";

      if (reason || !verdict.source) {
        dropped.push(`  DROPPED (${reason}): ${verdict.question}`);
        continue;
      }

      used.add(verdict.source.url);
      seen.add(verdict.question.toLowerCase());
      kept.push({ question: verdict.question, url: verdict.source.url });
    }

    out[channel] = kept.map((chip) => chip.question);
    console.log(`\n${channel} (${kept.length}/${quota}, from ${items.length} items)`);
    for (const chip of kept) console.log(`  ${chip.question}`);
    for (const line of dropped) console.log(line);
    if (kept.length < quota) {
      console.log(`  NOTE: ${quota - kept.length} short of the quota`);
    }
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
