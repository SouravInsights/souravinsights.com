import "./load-env";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateObject } from "ai";
import { z } from "zod";
import { and, isNull, ne, eq } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { suggestionModel } from "../src/lib/kb/model";
import { search } from "../src/lib/kb/search";
import { mapWithConcurrency } from "../src/lib/links/health";
import { CATEGORIES, CATEGORY_DEFS } from "../src/lib/kb/categories";

/**
 * Write the suggestion questions for the Ask panel.
 *
 *   npx tsx scripts/kb-suggestions.ts
 *
 * What these are for: someone arrives not knowing what to search for, reads a
 * few plain questions, and one of them is worth clicking. Three jobs, in the
 * owner's words — remember what's in here, meet connected ideas, follow
 * curiosity.
 *
 * How this works now, and what changed from v1:
 *   - ONE pass over the whole collection. v1 wrote chips per Discord channel,
 *     in isolated batches, so different batches repeated the same idea and
 *     nothing ever looked at the collection as a whole. Now the model sees the
 *     map (categories, the words in use, and every title) and is told to cover
 *     it, one chip per idea.
 *   - The material is the stored SUMMARY — 2-3 sentences written in the page's
 *     own voice. v1 read 200 characters of page opening; the summary knows far
 *     more, and it exists now.
 *   - Plain questions only. No hooks, no cleverness, no clickbait: a chip that
 *     performs is a chip nobody trusts.
 *
 * Three checks before a chip ships, in this order:
 *   1. shape and length — code, not prompt rules the model can ignore;
 *   2. retrieval — the chip must have a home in the index, and every item it
 *      claims must really surface;
 *   3. truth — a second model call reads the chip against its own evidence and
 *      drops anything vague, unsupported, or misstated. Retrieval alone never
 *      caught those, which is why the earlier sets read badly.
 */

/** How many chips to ask for. The surfaces show a slice; this is the shelf. */
const WANTED = 66;
/** Asked for beyond WANTED, so a rejected candidate leaves no hole. */
const ASKED = WANTED + 34;
/** Every category this size or bigger gets at least this many chips. */
const FLOOR_PER_CATEGORY = 4;
/** A category this small is left to the proportional pass alone. */
const SMALL_CATEGORY = 8;

/**
 * Words that carry no subject. Used only to spot chips that repeat a subject —
 * three "easing and motion" questions are one door, not three.
 */
const SUBJECTLESS = new Set([
  "how", "what", "why", "when", "where", "which", "who", "the", "a", "an",
  "and", "or", "of", "to", "in", "on", "for", "with", "vs", "versus", "is",
  "are", "do", "does", "from", "that", "this", "it", "its", "you", "your",
  "as", "at", "by", "not", "just", "than", "into", "over", "about", "up",
  "out", "actually", "really",
]);

/**
 * Which group a chip belongs to, for review: the single category it speaks
 * for, or "wide" when it reaches across several. A person's site question sits
 * under `people`; a question that only works by crossing tools, articles and
 * publications sits under `wide`.
 */
const groupOf = (categories: string[]): string =>
  categories.length === 1 ? categories[0] : "wide";

const subjectWords = (question: string): string[] =>
  question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((word) => word && !SUBJECTLESS.has(word));
/** Characters of each item's summary handed to the model. */
const SUMMARY_CHARS = 200;
/** A chip must clear this retrieval score. */
const MIN_SCORE = 0.35;
/** The item a chip claims to be about must retrieve within this many hits. */
const GROUNDING_RANK = 3;
/** A theme must be a real area: this many links carry it. */
const THEME_MIN_LINKS = 4;
/** A browse question needs at least this many saved items of the kind asked. */
const BROWSE_MIN_ITEMS = 3;
/** Chips are short on purpose — long ones read as articles, not questions. */
const MAX_WORDS = 8;
/** How many candidates are checked against the index at once. */
const VERIFY_CONCURRENCY = 4;
/** How many chips one truth-check call reads. */
const CHECK_BATCH = 12;

/**
 * Shapes that read as a topic, not a question — the exact strings v1 produced.
 * In code rather than the prompt because the prompt is what failed: a rule the
 * model can ignore is not a gate.
 */
const EMPTY_SHAPES =
  /^(updates? on|where to \w+|where \w+ (find|finds|look|looks)|best .{0,40} for|what is trending|how to (improve|learn|boost|master|get better))/i;

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
      kind: z
        .enum(["single", "connection", "theme", "browse"])
        .describe(
          "single = rests on one saved item · connection = rests on two or three that share a subject · theme = a subject the collection keeps returning to · browse = asks for a SET of saved things of one kind in a domain ('which tools for agent memory')"
        ),
      question: z
        .string()
        .describe("3-8 words, sentence case, no trailing question mark"),
      about: z
        .array(z.string())
        .max(3)
        .describe(
          "For single and connection: the exact title(s) it rests on, copied from the list. Empty for theme and browse."
        ),
      browseCategory: z
        .enum(CATEGORIES)
        .optional()
        .describe(
          "For browse only: which kind of thing the question asks for"
        ),
    })
  ),
});

const SYSTEM = [
  "You write the suggestion questions for a personal collection of saved",
  "links — the questions a visitor reads when they do not yet know what to",
  "search for. The three jobs: remember what is in here, meet connected ideas,",
  "follow curiosity.",
  "",
  "Voice:",
  "- Short. 3 to 6 words. A chip is a doorway, not a headline.",
  "- Plain questions, the way a curious person asks out loud. Nothing clever.",
  "- No hooks, no clickbait, no marketing language, no suspense.",
  "",
  "Four kinds. About two in five are themes, one in five is a browse question,",
  "- THEME: a subject this collection keeps returning to. Names no page and no",
  "  author. Leave `about` empty. A theme may be phrased as a question OR as a",
  "  short subject label — use labels often, they read like places to go rather",
  "  than a quiz: GOOD 'why soft delete leaks complexity' · 'keeping data close",
  "  to the user' · 'taste as a trainable skill' · 'the senior engineer death",
  "  spiral' · 'exit animations in React' · 'how agents lose the thread'.",
  "- SINGLE: about one saved item, listing its exact title in `about`. Use it",
  "  sparingly. GOOD 'why unhappiness is self-created'.",
  "- CONNECTION: about two or three saved items sharing a subject, listing each",
  "  exact title in `about`. GOOD 'where Linear and celld agree'.",
  "- BROWSE: asks for a SET of saved things of one kind in a domain — the",
  "  question a newcomer actually asks. Set `kind` to 'browse' and",
  "  `browseCategory` to the kind asked for. GOOD 'design engineers worth",
  "  following' · 'which tools exist for agent memory' · 'publications about",
  "  science and culture' · 'courses for learning animation' · 'galleries for",
  "  interface inspiration' · 'directories of design resources'.",
  "",
  "Rules:",
  "- Every question must be answerable from the saved items below. Invent",
  "  nothing.",
  "- This is not only a tech collection. It holds people's personal sites,",
  "  publications, directories, design and sound work, and essays about",
  "  history, biology and culture. Speak for all of it.",
  "- Include the obvious: a few questions a first-time visitor would ask about",
  "  each area, next to the deep cuts.",
  "- Ask about the subject — a decision, a mechanism, a tradeoff, a",
  "  comparison. A person's name is welcome when the question is about their",
  "  work; never ask for biography or audience.",
  "- Sentence case. No trailing question mark. One clause.",
  "- Never a claim, a slogan, or a prediction.",
  "- Never these empty shapes: 'updates on X', 'where to find X', 'best X for",
  "  Y', 'what is trending in X', 'how to improve X'.",
  "- Spread out: at most two questions may share a subject.",
  "",
  "Illustrations, never answers — do not reuse one:",
  "- BAD 'how does a halftone shader build a dot from UV coordinates'",
  "  GOOD 'halftone from dot to artwork'",
  "- BAD 'what does the senior engineer death spiral look like at a new job'",
  "  GOOD 'the senior engineer death spiral'",
  "- BAD 'updates on React Native development'",
  "  GOOD 'what breaks when agents write production code'",
].join("\n");


/**
 * What a visitor wants to know, per category.
 *
 * One generic rulebook produced chips that made sense for nothing: a tool, a
 * publication and a gallery are not asked the same question. Each entry below
 * says what a reader actually wonders in front of that kind of thing, with the
 * examples that earned it — the material handed to the model is the same
 * category's own items, so the two line up.
 */
const CHIP_INTENTS: Record<string, string> = {
  article: [
    "What a reader wonders here: what this piece argues, decides or explains.",
    "One item per question; the deep cut, not the summary.",
    "GOOD 'when a query planner picks the wrong index' · 'why retyping LLM code prevents cognitive debt'",
  ].join("\n"),
  publication: [
    "What a reader wonders here: what this outlet publishes, who it is for, and",
    "why it is worth following or subscribing to. Also: which outlet covers a",
    "subject, and how two outlets differ.",
    "Name the outlet. Never write 'X on Y' — that describes, it does not ask.",
    "GOOD 'what does The Pudding actually publish' · 'why subscribe to Cold Takes'",
    "· 'where to read serious writing about computing history' ·",
    "'publications worth paying for'",
  ].join("\n"),
  people: [
    "What a reader wonders here: who is worth following, what a person works on,",
    "and what they write about. Every question must NAME a person whose page",
    "is in the list, and carry their exact title in `about`. A name means a body",
    "of work, not a biography — never a one-line CV.",
    "GOOD 'design engineers worth following' · 'who writes about animation craft'",
    "· 'what does Emil Kowalski teach about motion' · 'designers who build their own sites'",
  ].join("\n"),
  tool: [
    "What a reader wonders here: what a tool does, what it is for, what it costs,",
    "what it replaces, which tools do the same job, and which one fits a use case.",
    "This is the biggest part of the collection, so dig: name the job, not the",
    "category. 'AI tools' is nothing; 'a sandbox for running agent code' is a door.",
    "GOOD 'which sandbox fits long-running agents' · 'what Val Town actually does'",
    "· 'cheapest way to run background jobs' · 'tools that turn screenshots into code'",
    "· 'what runs MCP servers in production'",
  ].join("\n"),
  learning: [
    "What a reader wonders here: what a course or book teaches, what level it is",
    "for, what you would build with it, and whether it earns the time or price.",
    "GOOD 'which course teaches animation properly' · 'a Postgres course for",
    "people who already build' · 'learning React from first principles'",
  ].join("\n"),
  inspiration: [
    "What a reader wonders here: where to look for inspiration of a particular",
    "kind — mobile patterns, real app motion, desk setups, screenshots, colour —",
    "and what each gallery is best at.",
    "GOOD 'where to find real app motion' · 'galleries for mobile UI patterns' ·",
    "'best places for interface screenshots' · 'sites that collect homepage design'",
  ].join("\n"),
  directory: [
    "What a reader wonders here: which lists and collections exist for a subject,",
    "and what each one collects. The value is the pointing, so ask where it points.",
    "GOOD 'lists of personal blogs worth reading' · 'resource stashes for design",
    "engineers' · 'directories of open-source alternatives'",
  ].join("\n"),
  other: [
    "What a reader wonders here: whatever these pages are for.",
  ].join("\n"),
};

/**
 * The wide pass: one call over the whole collection for questions that only
 * work by crossing categories.
 */
const WIDE_INTENT = [
  "What a reader wonders here: a subject the collection keeps returning to",
  "across many kinds of links at once — a thread, not a page.",
  "GOOD 'the senior engineer death spiral' · 'easing curves and the rhythm of",
  "movement' · 'why agents lose the thread in production' · 'taste as a skill'",
].join("\n");

/**
 * The truth check. Retrieval only proves a chip has *a* home in the index; it
 * says nothing about whether the chip is true, specific, or worth a doorway.
 * So every survivor is read against its own evidence and dropped when it
 * states something the evidence does not say, or when it is vague enough to
 * mean anything. This is the stage that would have caught "what computers are
 * bad teaches about tech history" and "insights weekly".
 */
const CHECK_SYSTEM = [
  "You check suggestion questions for a personal link collection before they",
  "ship. Each question comes with the evidence it rests on.",
  "",
  "Drop the question when any of these is true:",
  "- The evidence does not say what the question states — a number, a name, a",
  "  frequency, a claim.",
  "- It is vague: no concrete subject, or a phrase that could mean anything.",
  "- A chip may be a short subject LABEL instead of a question ('exit",
  "  animations in React', 'the senior engineer death spiral'). Keep those when",
  "  the label names a concrete subject the evidence covers; drop them only when",
  "  vague or unsupported.",
  "- It reads like copy or marketing rather than a question.",
  "- It asks WHO SOMEONE IS or asks for an audience, rather than about their",
  "  work. 'Amelia Wattenberger on novel interfaces' is fine — a name plus a",
  "  subject. 'What does Amelia Wattenberger do' is not. A browse question",
  "  naming a field ('design engineers worth following') is fine when the",
  "  evidence lists several of that kind.",
  "Keep it when the evidence supports a plain, specific question.",
  "Answer for every question, in the order given, with a short reason.",
].join("\n");

/**
 * The substance check — the owner's test, done cheaply: take the question to
 * the index, hand the retrieved passages to a model, and ask whether the
 * collection genuinely answers it. A chip nobody can answer is worse than no
 * chip: it teaches the visitor that asking here is pointless.
 */
const SUBSTANCE_SYSTEM = [
  "A suggestion question is shown to visitors of a curated link collection.",
  "You get the question and the passages the collection returns for it.",
  "Say whether the collection actually answers it:",
  "- strong: the passages answer it concretely — a fact, a decision, a list.",
  "- partial: only obliquely, or one thin mention.",
  "- none: nothing relevant came back.",
  "One short sentence of why.",
].join("\n");

const SubstanceSchema = z.object({
  verdict: z.enum(["strong", "partial", "none"]),
  why: z.string(),
});

const CheckSchema = z.object({
  verdicts: z.array(
    z.object({
      question: z.string(),
      verdict: z.enum(["keep", "drop"]),
      reason: z.string(),
    })
  ),
});

/**
 * The panel's chips are sentence case; the model capitalises its first word.
 * Only question openers are touched, so a chip starting with "GitHub…" keeps
 * its capitals.
 */
const OPENERS =
  /^(How|What|Why|Which|Where|When|Who|Whose|Does|Do|Is|Are|Can|Should|Would|Will|Did|The|A|An)\b/;
const sentenceCase = (chip: string): string =>
  chip.replace(OPENERS, (word) => word.toLowerCase());

interface Item {
  title: string;
  url: string;
  category: string | null;
  topics: string[] | null;
  summary: string | null;
}

/**
 * Chips per category: a floor first, so nothing in the collection is ignored,
 * then the rest in proportion to how much each category holds. The collection
 * is a wide place — people, publications, directories and non-technical essays
 * sit next to the AI and design material — and chips that only ever speak for
 * the biggest category misrepresent it.
 */
function quotaTable(counts: Map<string, number>, wanted: number): Map<string, number> {
  const known = Array.from(counts.entries()).filter(
    ([name]) => name !== "(unclassified)"
  );
  const quotas = new Map<string, number>();
  let left = wanted;

  for (const [name, n] of known) {
    if (n < SMALL_CATEGORY) continue;
    const floor = Math.min(FLOOR_PER_CATEGORY, n);
    quotas.set(name, floor);
    left -= floor;
  }

  const totalItems = known.reduce((sum, [, n]) => sum + n, 0);
  for (const [name, n] of known) {
    if (left <= 0) break;
    const extra = Math.min(Math.round((n / totalItems) * wanted), left);
    quotas.set(name, (quotas.get(name) ?? 0) + extra);
    left -= extra;
  }
  return quotas;
}

/**
 * Resolve one title to its item: exact first, then either-direction prefix.
 * The model occasionally packs several titles into one entry ("A | B | C"),
 * so the entry is also split on the separators before giving up — a good chip
 * should not die over that.
 */
function itemsFor(title: string, items: Item[]): Item[] {
  const parts = title
    .split(/\s*[|·,]\s*|\s+and\s+/i)
    .map((part) => part.trim().replace(/[.…\s]+$/, ""))
    .filter(Boolean);
  const resolved: Item[] = [];
  for (const part of parts.length ? parts : [title]) {
    const wanted = part.toLowerCase();
    const found =
      items.find((item) => item.title.toLowerCase() === wanted) ??
      items.find(
        (item) =>
          item.title.toLowerCase().startsWith(wanted) ||
          wanted.startsWith(item.title.toLowerCase())
      );
    if (found && !resolved.some((item) => item.url === found.url)) {
      resolved.push(found);
    }
  }
  return resolved;
}

async function main() {
  // The collection: every readable, visible link with the material it carries.
  const rows = await db
    .select({
      title: links.title,
      url: links.url,
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

  const items: Item[] = rows.map((row) => ({
    title: row.title || row.url,
    url: row.url,
    category: row.category,
    topics: row.topics,
    summary: row.summary,
  }));

  // The map: how big each category is, and the words the collection uses most.
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const key = item.category ?? "(unclassified)";
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }
  const topicCounts = new Map<string, number>();
  for (const item of items) {
    for (const topic of item.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60);

  // Which links share a subject — this is where connection questions come
  // from, so the model gets the topic and a few of its titles, not just the
  // count.
  const topicIndex = topTopics
    .map(([topic, n]) => {
      const carriers = items
        .filter((item) => (item.topics ?? []).includes(topic))
        .slice(0, 4)
        .map((item) => item.title);
      return `- ${topic} (${n}): ${carriers.join(" · ")}`;
    })
    .join("\n");

  const quotas = quotaTable(byCategory, WANTED);
  console.log(`material: ${items.length} items · ${byCategory.size} categories`);

  /** The lines the model reads for one item. */
  const linesFor = (list: Item[]) =>
    list
      .map((item) => {
        const summary = (item.summary ?? "").replace(/\s+/g, " ").slice(0, SUMMARY_CHARS);
        const topics = (item.topics ?? []).slice(0, 6).join(", ");
        return `- ${item.title}${topics ? ` [${topics}]` : ""}${summary ? `\n  ${summary}` : ""}`;
      })
      .join("\n");

  type Proposed = {
    kind: "single" | "connection" | "theme" | "browse";
    question: string;
    about: string[];
    browseCategory?: string;
  };

  /**
   * One pass per category, each with its own intent and its own items — a
   * publication and a tool are not asked the same question. Plus one wide pass
   * over the whole collection for threads that cross categories.
   */
  const proposed: Proposed[] = [];
  const askCategory = async (category: string, target: number) => {
    const inCategory = items.filter(
      (item) => (item.category ?? "(unclassified)") === category
    );
    if (inCategory.length < 3) return;
    const { object } = await generateObject({
      model: suggestionModel(),
      schema: ChipSchema,
      system: SYSTEM,
      prompt:
        `Category: ${category} — ${
          category in CATEGORY_DEFS
            ? CATEGORY_DEFS[category as keyof typeof CATEGORY_DEFS].prompt
            : "pages not placed yet"
        }\n\n` +
        `${CHIP_INTENTS[category] ?? CHIP_INTENTS.other}\n\n` +
        `The ${inCategory.length} saved items in this category:\n${linesFor(inCategory)}\n\n` +
        `Write ${target + Math.max(4, Math.ceil(target / 3))} questions for this category.`,
    });
    proposed.push(...object.chips);
  };

  for (const category of CATEGORIES) {
    await askCategory(category, quotas.get(category) ?? 0);
  }

  const wideTarget = 12;
  const { object: wideObject } = await generateObject({
    model: suggestionModel(),
    schema: ChipSchema,
    system: SYSTEM,
    prompt:
      `The collection holds ${items.length} saved links across ${
        CATEGORIES.length
      } categories.\n\n` +
      `Words it uses most, with a few links carrying each:\n${topicIndex}\n\n` +
      `Titles only, so nothing is missed:\n${items
        .map((item) => `- ${item.title}`)
        .join("\n")}\n\n` +
      `${WIDE_INTENT}\n\n` +
      `Write ${wideTarget + 6} questions that cross categories — the kind a` +
      ` reader asks when they do not know which shelf to look on.`,
  });
  proposed.push(...wideObject.chips);

  console.log(`proposed: ${proposed.length} questions before checks`);

  // Check every candidate, in the model's order, cheapest check first.
  const verdicts = await mapWithConcurrency(
    proposed,
    VERIFY_CONCURRENCY,
    async (chip): Promise<{
      question: string;
      sources?: Item[];
      theme?: boolean;
      /** Every category the theme's links live in — a theme can span several. */
      themeCategories?: string[];
      /** What the chip rests on, for the truth check to read. */
      evidence?: string;
      reason?: string;
    }> => {
      const question = sentenceCase(chip.question.trim());
      if (EMPTY_SHAPES.test(question)) return { question, reason: "empty shape" };
      if (question.split(/\s+/).length > MAX_WORDS) {
        return { question, reason: `too long (${question.split(/\s+/).length} words)` };
      }

      // A browse question asks for a set of saved things of one kind. It is
      // true when the index really holds several of that kind in that domain —
      // "which tools for agent memory" must actually return tools.
      if (chip.kind === "browse") {
        if (!chip.browseCategory) {
          return { question, reason: "browse question without a kind" };
        }
        // Checked against the collection, not against search luck: the
        // question must be met by several saved items OF THAT KIND whose own
        // words cover the domain it names. Embedding similarity was the wrong
        // instrument here — it failed a 85-link tool category.
        const words = subjectWords(question);
        const ofKind = items.filter(
          (item) =>
            item.category === chip.browseCategory &&
            words.some((word) =>
              `${item.title} ${item.summary ?? ""}`.toLowerCase().includes(word)
            )
        );
        if (ofKind.length < BROWSE_MIN_ITEMS) {
          return {
            question,
            reason: `only ${ofKind.length} ${chip.browseCategory} item(s) match it`,
          };
        }
        return {
          question,
          theme: true,
          themeCategories: [chip.browseCategory],
          evidence: ofKind
            .slice(0, 4)
            .map((item) => `${item.title}: ${(item.summary ?? "").slice(0, 220)}`)
            .join("\n"),
        };
      }

      // A theme rests on no single item: it must be a real area of the
      // collection. Enough distinct links, from more than one category, is
      // what "real area" means in a way a machine can check.
      if (chip.about.length === 0) {
        const hits = await search(question, { limit: 8 });
        const good = hits.filter((hit) => hit.score >= MIN_SCORE);
        if (good.length < THEME_MIN_LINKS) {
          return { question, reason: `thin theme (${good.length} links)` };
        }
        return {
          question,
          theme: true,
          themeCategories: Array.from(
            new Set(good.map((hit) => hit.category).filter((c): c is string => Boolean(c)))
          ),
          evidence: good
            .slice(0, 4)
            .map(
              (hit) =>
                `${hit.title}: ${hit.passages[0]?.content.slice(0, 220) ?? ""}`
            )
            .join("\n"),
        };
      }

      const sources = chip.about.flatMap((title) => itemsFor(title, items));
      if (!sources.length) {
        return { question, reason: `about named nothing we sent: ${chip.about.join(" | ")}` };
      }
      const uniqueItems = Array.from(
        new Map(sources.map((s) => [s.url, s])).values()
      ).slice(0, 3);

      // Every listed item must show up when the question is searched. One
      // missing item means the premise is wrong.
      const rank = Math.max(GROUNDING_RANK, 2 * uniqueItems.length);
      const hits = await search(question, { limit: rank });
      const top = hits[0];
      if (!top || top.score < MIN_SCORE) {
        return { question, reason: `no match in the index (${top?.score.toFixed(3) ?? "none"})` };
      }
      const missing = uniqueItems.filter(
        (item) => !hits.some((hit) => hit.url === item.url)
      );
      if (missing.length) {
        return {
          question,
          reason: `listed item(s) don't surface: ${missing.map((m) => m.title).join(" | ")}`,
        };
      }
      return {
        question,
        sources: uniqueItems,
        evidence: uniqueItems
          .map((item) => `${item.title}: ${(item.summary ?? "").slice(0, 220)}`)
          .join("\n"),
      };
    }
  );

  // Keep them in the model's order: no repeated questions, one chip per item
  // group (a connection may reuse an item a single chip already used).
  // The truth check, in batches: does the evidence support the chip, is it
  // specific, is it free of claims the collection never made?
  const passers = verdicts.filter(
    (verdict) => !verdict.reason && (verdict.sources || verdict.theme)
  );
  const checked = new Map<string, { keep: boolean; reason: string }>();
  for (let i = 0; i < passers.length; i += CHECK_BATCH) {
    const batch = passers.slice(i, i + CHECK_BATCH);
    const { object: checkedObject } = await generateObject({
      model: suggestionModel(),
      schema: CheckSchema,
      system: CHECK_SYSTEM,
      prompt: batch
        .map(
          (verdict, index) =>
            `${index + 1}. ${verdict.question}\n   evidence: ${verdict.evidence ?? ""}`
        )
        .join("\n\n"),
    });
    for (const verdict of checkedObject.verdicts) {
      checked.set(verdict.question, {
        keep: verdict.verdict === "keep",
        reason: verdict.reason,
      });
    }
  }

  // The substance check: what a visitor would get if they clicked.
  const substance = new Map<string, { verdict: string; why: string }>();
  await mapWithConcurrency(
    passers,
    VERIFY_CONCURRENCY,
    async (verdict) => {
      // A browse chip is judged against its own kind: "galleries for X" must
      // be answered by galleries, not by whatever happens to rank high.
      const hits = await search(verdict.question, {
        limit: 3,
        passagesPerLink: 2,
        category: verdict.themeCategories?.[0],
      });
      const evidence = hits
        .map(
          (hit) =>
            `${hit.title}: ${hit.passages
              .map((passage) => passage.content.slice(0, 300))
              .join(" ")}`
        )
        .join("\n\n");
      const { object: judged } = await generateObject({
        model: suggestionModel(),
        schema: SubstanceSchema,
        system: SUBSTANCE_SYSTEM,
        prompt: `Question: ${verdict.question}\n\nPassages the collection returns:\n${
          evidence || "(nothing)"
        }`,
      });
      substance.set(verdict.question, judged);
      return judged;
    }
  );

  // Everything that passed the gates, in the model's order. Then two passes
  // decide what fits: first every category gets its quota (so an 85-link tool
  // category isn't spoken for by one chip while articles take forty-three),
  // then whatever room is left goes to the overflow so the shelf stays full.
  const candidates: {
    question: string;
    /** Categories this chip speaks for: one for a single item, several for a theme. */
    categories: string[];
    /** The exact set of items this chip rests on; undefined for a theme. */
    signature?: string;
  }[] = [];
  const dropped: string[] = [];
  for (const verdict of verdicts) {
    if (verdict.reason || (!verdict.sources && !verdict.theme)) {
      dropped.push(`  DROPPED (${verdict.reason}): ${verdict.question}`);
      continue;
    }
    const check = checked.get(verdict.question);
    if (check && !check.keep) {
      dropped.push(`  DROPPED (truth check: ${check.reason}): ${verdict.question}`);
      continue;
    }
    const answered = substance.get(verdict.question);
    if (answered?.verdict === "none") {
      dropped.push(`  DROPPED (nothing answers it: ${answered.why}): ${verdict.question}`);
      continue;
    }
    candidates.push({
      question: verdict.question,
      categories: verdict.theme
        ? verdict.themeCategories ?? []
        : Array.from(
            new Set(
              (verdict.sources ?? [])
                .map((source) => source.category)
                .filter((c): c is string => Boolean(c))
            )
          ),
      signature: verdict.theme
        ? undefined
        : (verdict.sources ?? [])
            .map((s) => s.url)
            .sort()
            .join("+"),
    });
  }

  const kept: { question: string; categories: string[] }[] = [];
  const keptSignatures = new Set<string>();
  const keptSubjects: string[][] = [];
  const keptPerCategory = new Map<string, number>();
  const seen = new Set<string>();

  /** All the per-chip rules: no repeats, enough variety, room to spare. */
  const canKeep = (chip: {
    question: string;
    categories: string[];
    signature?: string;
  }): string | null => {
    const key = chip.question.toLowerCase();
    if (seen.has(key)) return "a repeat";
    if (chip.signature && keptSignatures.has(chip.signature)) {
      return "same items as one we kept";
    }
    const words = subjectWords(chip.question);
    const overlaps = keptSubjects.filter(
      (keptWords) => words.filter((word) => keptWords.includes(word)).length >= 2
    ).length;
    if (overlaps >= 2) return "a subject we already have two of";
    return null;
  };

  const keep = (chip: {
    question: string;
    categories: string[];
    signature?: string;
  }) => {
    if (chip.signature) keptSignatures.add(chip.signature);
    seen.add(chip.question.toLowerCase());
    keptSubjects.push(subjectWords(chip.question));
    // A chip counts once for every category it genuinely speaks for, so the
    // report answers "is this category spoken for?" rather than "where did the
    // first hit happen to land?".
    for (const category of chip.categories.length ? chip.categories : ["(none)"]) {
      keptPerCategory.set(category, (keptPerCategory.get(category) ?? 0) + 1);
    }
    kept.push(chip);
  };

  // Pass 1: the quotas. A chip is over quota only when it speaks for nothing
  // but full categories.
  const overflow: typeof candidates = [];
  for (const chip of candidates) {
    const blocked = canKeep(chip);
    if (blocked) {
      dropped.push(`  DROPPED (${blocked}): ${chip.question}`);
      continue;
    }
    const open = chip.categories.filter(
      (category) => (keptPerCategory.get(category) ?? 0) < (quotas.get(category) ?? 0)
    );
    if (chip.categories.length && open.length === 0) {
      overflow.push(chip);
      continue;
    }
    keep(chip);
  }

  // Pass 2: fill the leftover room round-robin, so the biggest category that
  // happens to come first in the model's answer cannot take the rest.
  const overflowByCategory = new Map<string, typeof candidates>();
  for (const chip of overflow) {
    const key = chip.categories[0] ?? "(none)";
    overflowByCategory.set(key, [...(overflowByCategory.get(key) ?? []), chip]);
  }
  const fillRatio = (category: string) =>
    (keptPerCategory.get(category) ?? 0) / Math.max(1, quotas.get(category) ?? 1);
  const fillOrder = Array.from(overflowByCategory.keys()).sort(
    (a, b) => fillRatio(a) - fillRatio(b)
  );
  let added = true;
  while (kept.length < WANTED && added) {
    added = false;
    for (const category of fillOrder) {
      const list = overflowByCategory.get(category) ?? [];
      const chip = list.shift();
      if (!chip) continue;
      const blocked = canKeep(chip);
      if (blocked) {
        dropped.push(`  DROPPED (${blocked}): ${chip.question}`);
        continue;
      }
      keep(chip);
      added = true;
      if (kept.length >= WANTED) break;
    }
  }
  for (const list of Array.from(overflowByCategory.values())) {
    for (const chip of list) {
      dropped.push(`  DROPPED (over the target count): ${chip.question}`);
    }
  }

  // Grouped by what each chip speaks for — one category, or `wide` when it
  // only works by crossing several. This shape is for reading and reviewing;
  // the site flattens it.
  const grouped: Record<string, string[]> = {};
  for (const category of CATEGORIES) grouped[category] = [];
  grouped.wide = [];
  for (const chip of kept) {
    const group = groupOf(chip.categories);
    (grouped[group] ??= []).push(chip.question);
  }

  writeFileSync(OUT, `${JSON.stringify(grouped, null, 2)}\n`);

  console.log(`\n${kept.length} questions:`);
  for (const [group, questions] of Object.entries(grouped)) {
    if (!questions.length) continue;
    console.log(`\n## ${group} (${questions.length})`);
    for (const question of questions) console.log(`  ${question}`);
  }
  console.log("\ndropped:");
  for (const line of dropped) console.log(line);

  // The spread, so nobody has to guess whether a category was spoken for.
  const spread = new Map<string, number>();
  for (const chip of kept) {
    for (const category of chip.categories) {
      spread.set(category, (spread.get(category) ?? 0) + 1);
    }
    if (chip.categories.length === 0) {
      spread.set("(no category)", (spread.get("(no category)") ?? 0) + 1);
    }
  }
  console.log("\ncoverage:");
  for (const [name, n] of Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])) {
    const chips = spread.get(name) ?? 0;
    console.log(`  ${name.padEnd(14)} ${String(byCategory.get(name)).padStart(3)} links · ${chips} chips`);
  }
  console.log(`  chips speaking for no category: ${spread.get("(no category)") ?? 0}`);
  console.log(`\nwrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
