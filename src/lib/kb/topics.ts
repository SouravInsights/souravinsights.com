import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";

/**
 * topics.ts — the rules for what may become a topic.
 *
 * WHAT TOPICS ARE FOR
 * A topic is a label shared by many links, so related links can be found
 * together (a filter chip on the site). One job: JOINING. A word that can
 * only ever sit on one link — a one-off curiosity, a spelling variant —
 * joins nothing, so it is noise for us. (A page's unique quirks belong in
 * its summary, not its topics.)
 *
 * WHERE THIS FILE SITS
 * The model proposes topics; this file decides what gets stored. Nothing
 * reaches the database without passing cleanTopics(). When a run reveals a
 * new kind of noise, this file gets one more line — that is the whole
 * maintenance process.
 */

/**
 * BANNED_TOPICS — words that may never be topics, three kinds:
 *
 *  1. tautologies: words true of nearly every link in THIS collection
 *     ("software development" on a software-heavy collection) — a chip
 *     that selects everybody selects nobody. Only words MEASURED to be
 *     everywhere belong here; a niche word like "blogging" (4 links) is a
 *     facet, not an umbrella, and stays legal.
 *  2. category words: a link's SHAPE lives in its `category` field; the
 *     same fact twice is not a topic.
 *  3. attributes: billing ("pricing") is a fact about a product page,
 *     not a subject; packaging words ("tutorial", "guide") are the form,
 *     not the subject.
 */
const BANNED_TOPICS = new Set([
  // tautologies
  "software development", "technology", "tech", "coding", "general",
  "content", "media", "resources",
  // packaging words
  "tutorial", "guide",
  // category words, including the retired v1 names
  "article", "blog", "blogs", "publication", "people", "person",
  "tool", "tools", "learning", "inspiration", "directory", "other",
  "newsletter", "newsletters", "portfolio", "gallery", "galleries",
  // billing
  "pricing",
]);

const MAX_TOPICS = 7; // never store more than this, no matter what the model says
const MAX_TOPIC_WORDS = 4; // a topic is 1-4 words…
const MAX_TOPIC_CHARS = 30; // …anything longer is a pasted sentence, not a subject

/** Tidy one topic: "Open Source " and "open  source" become "open source". */
const tidyTopic = (topic: string) =>
  topic.toLowerCase().trim().replace(/\s+/g, " ").replace(/\.+$/, "");

/** The identity key of a spelling: just its letters and digits, squashed. */
const spellingKeyOf = (topic: string) =>
  tidyTopic(topic).replace(/[^a-z0-9]/g, "");

/**
 * Are two spellings the same word? Only what letters can PROVE:
 * identical keys, or one is the other plus a trailing "s".
 *
 * @example sameWordByLetters("open-source", "open source") → true  (same letters)
 * @example sameWordByLetters("illustrations", "illustration") → true  (plain plural)
 * @example sameWordByLetters("llm", "language models") → false  (letters can't tell
 *          that one; that judgement is the model's job, in buildTopicVocabulary)
 */
const sameWordByLetters = (a: string, b: string) => {
  const [ka, kb] = [spellingKeyOf(a), spellingKeyOf(b)];
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const [short, long] = ka.length < kb.length ? [ka, kb] : [kb, ka];
  return long === short + "s";
};

/**
 * cleanTopics — the seven gates every proposed topic passes, in order.
 * The model proposes; these gates decide.
 *
 * @example
 *   cleanTopics([
 *     "Agents", "ai agents", "Design", "web design", "pricing",
 *     "react", "our full guide to modern frontend infrastructure",
 *   ])
 *   // gate 1 tidy:      lowercase, trimmed
 *   // gate 2 spellings: known variants swap to the winning spelling
 *   // gate 3 shape:     the long sentence drops (over 4 words)
 *   // gate 4 banned:    "pricing" drops
 *   // gate 5 dedupe:    exact repeats drop
 *   // gate 6 contained: "design" drops ("web design" covers it) and
 *   //                   "agents" drops ("ai agents" covers it)
 *   // gate 7 cap:       first 7 survivors win
 *   → ["ai agents", "web design", "react"]
 */
export function cleanTopics(
  topics: string[],
  /** word -> the collection's winning spelling, from buildTopicVocabulary(). */
  winningSpellings: Record<string, string> = {}
): string[] {
  // gates 1-4
  const cleaned = topics
    .map(tidyTopic)
    .filter(Boolean)
    .map((t) => winningSpellings[t] ?? t)
    .filter(
      (t) =>
        t.length <= MAX_TOPIC_CHARS && t.split(" ").length <= MAX_TOPIC_WORDS
    )
    .filter((t) => !BANNED_TOPICS.has(t));

  // gate 5
  const unique = Array.from(new Set(cleaned));

  // gate 6: a general word goes when a specific one on the same link covers
  // it. Compared word by word, so "css" is never eaten by "scss".
  const wordsOf = (t: string) => t.split(/[\s-]+/);
  const kept = unique.filter(
    (a) =>
      !unique.some(
        (b) =>
          b !== a &&
          wordsOf(b).length > wordsOf(a).length &&
          wordsOf(a).every((w) => wordsOf(b).includes(w))
      )
  );

  // gate 7
  return kept.slice(0, MAX_TOPICS);
}

/** Count every topic spelling across the collection. */
function countTopicSpellings(rowsTopics: (string[] | null)[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const topics of rowsTopics) {
    for (const tidy of (topics ?? []).map(tidyTopic).filter(Boolean)) {
      counts.set(tidy, (counts.get(tidy) ?? 0) + 1);
    }
  }
  return counts;
}

/** The winner in a cluster: most-used spelling, ties go shorter, then a-z. */
function pickMostUsedSpelling(
  spellings: string[],
  counts: Map<string, number>
): string {
  return spellings.sort(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      a.length - b.length ||
      a.localeCompare(b)
  )[0];
}

/**
 * buildTopicVocabulary — what the prompt hands the model to reuse, plus the
 * winning spelling of every known variant.
 *
 * Why it exists: left alone, the model coins the same idea ten ways
 * ("motion" on one page, "animation" on the next) and nothing joins. The
 * vocabulary says "prefer these words", so pages settle on shared spellings.
 *
 * How winners are learned, two rounds:
 *   1. letters: sameWordByLetters clusters spellings provably alike
 *      ("open-source" with "open source").
 *   2. meaning: ONE LLM call reviews the recurring words (used on 2+ links)
 *      and groups true synonyms ("llm" with "language models") — judging
 *      sameness of meaning is what a model is for. A failed call just
 *      means round 1's answer; it never breaks a build.
 * In both rounds the WINNER is always the most-used spelling, never the
 * model's taste.
 *
 * @example winners might be { "open-source" → "open source",
 *   "front-end" → "frontend", "llm" → "language models" } (counts decide)
 *
 * Returns:
 *   vocabulary:  the ~150 strongest words with headcounts, e.g.
 *                ["agents (66)", "design (60)", …] — for the describe prompt
 *   winningSpellings: { variant → winner } — for cleanTopics()
 */
export async function buildTopicVocabulary(
  rowsTopics: (string[] | null)[],
  model: LanguageModel,
  limit = 150
): Promise<{ vocabulary: string[]; winningSpellings: Record<string, string> }> {
  const counts = countTopicSpellings(rowsTopics);
  const all = Array.from(counts.keys());

  // Round 1, letters: every word joins the first cluster its letters prove
  // it matches, else starts its own.
  const clusters: string[][] = [];
  for (const spelling of all) {
    const home = clusters.find((c) => c.some((m) => sameWordByLetters(m, spelling)));
    if (home) home.push(spelling);
    else clusters.push([spelling]);
  }

  // Round 2, meaning. Skipped on small vocabularies: a handful of words
  // holds no synonym structure, and a degenerate list makes the model
  // invent groups (measured: on 2 words it merged "open source" with
  // "agents").
  const recurring = all.filter((t) => (counts.get(t) ?? 0) >= 2);
  if (recurring.length >= 30) {
    try {
      const { output } = await generateText({
        model,
        // Generous ceiling: reasoning models can think for minutes on a
        // several-hundred-word list, and that is fine in a batch job.
        abortSignal: AbortSignal.timeout(360_000),
        output: Output.object({
          schema: z.object({ groups: z.array(z.array(z.string())) }),
        }),
        prompt: [
          "Topic keywords used across a personal link collection, one per line:",
          "",
          ...recurring,
          "",
          'Group TRUE synonyms only: terms that mean the same concept in this collection (like "llm" and "language models", or "ai" and "artificial intelligence"). When in doubt, do not group. Return only the groups.',
        ].join("\n"),
      });
      if (output) {
        for (const group of output.groups) {
          // Every grouped word's clusters merge into one. A word the model
          // invented (not in our vocabulary) counts for nothing.
          const homes = clusters.filter((c) => c.some((m) => group.includes(m)));
          if (homes.length > 1) {
            const merged = homes.flat();
            for (const home of homes) clusters.splice(clusters.indexOf(home), 1);
            clusters.push(merged);
          }
        }
      }
    } catch (error) {
      console.warn(
        `  topic curation skipped (${error instanceof Error ? error.message.slice(0, 60) : error}); using letter-proven merges only`
      );
    }
  }

  const winningSpellings: Record<string, string> = {};
  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const winner = pickMostUsedSpelling(cluster, counts);
    for (const variant of cluster) {
      if (variant !== winner) winningSpellings[variant] = winner;
    }
  }

  const joinedCounts = new Map<string, number>();
  for (const topics of rowsTopics) {
    for (const tidy of cleanTopics(topics ?? [], winningSpellings)) {
      joinedCounts.set(tidy, (joinedCounts.get(tidy) ?? 0) + 1);
    }
  }
  const vocabulary = Array.from(joinedCounts.entries())
    .filter(([, n]: [string, number]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t, n]) => `${t} (${n})`);

  return { vocabulary, winningSpellings };
}
