/**
 * Topics — the small keywords that let related links find each other.
 *
 * Their one job is JOINING. A topic is a chip someone can click to see every
 * link that shares it, so a word that can never appear on two links (a
 * one-off curiosity, a variant spelling) is noise for this feature — the
 * signature details of a page belong in its summary, not its topics.
 *
 * The model proposes topics (prompts.ts asks for them); THIS file decides
 * what gets stored. Nothing the model says reaches the database without
 * passing through applyTopicPolicy below.
 */

/**
 * Words too broad to join anything useful ("software development" is true of
 * half the collection), category names (the shape lives in `category`, not
 * in topics), and billing (an attribute, not a subject).
 */
const STOP_WORDS = new Set([
  "software development", "technology", "tech", "coding", "general",
  "resources", "business", "marketing", "media", "content", "web",
  "internet", "writing", "blogging", "education", "tutorial", "guide",
  "models",
  "article", "blog", "blogs", "publication", "people", "person",
  "tool", "tools", "learning", "inspiration", "directory", "other",
  // the retired v1 category names too
  "newsletter", "newsletters", "portfolio", "gallery", "galleries",
  "pricing",
]);

/**
 * One spelling per idea. When a run shows a new variant of the same word
 * ("open-source" next to "open source"), it gets one row here — never a
 * second spelling in the vocabulary.
 */
const CANONICAL: Record<string, string> = {
  "open-source": "open source",
  "front-end": "frontend",
  "ai agents": "agents",
  "language models": "llm",
  postgresql: "postgres",
  illustrations: "illustration",
  animations: "animation",
};

const MAX_TOPICS = 7;
/** A topic is 1-4 words. Longer means the model pasted a sentence, not a subject. */
const MAX_TOPIC_WORDS = 4;
const MAX_TOPIC_CHARS = 30;

const normalize = (topic: string) =>
  topic.toLowerCase().trim().replace(/\s+/g, " ").replace(/\.+$/, "");

/**
 * The policy, top to bottom:
 *
 *   1. normalize   lowercase, trimmed, tidy spacing
 *   2. canonical   swap in the one true spelling
 *   3. shape       a topic is 1-4 short words — longer is a pasted
 *                  sentence, not a subject; drop it
 *   4. stop-list   drop words too broad or off-subject to join anything
 *   5. dedupe      exact repeats go
 *   6. contain     when a general word sits inside a specific one on the
 *                  same link ("design" beside "web design"), keep only the
 *                  specific one — the general one adds nothing
 *   7. cap         at most MAX_TOPICS survive
 */
export function applyTopicPolicy(topics: string[]): string[] {
  const cleaned = topics
    .map(normalize)
    .filter(Boolean)
    .map((t) => CANONICAL[t] ?? t)
    .filter(
      (t) => t.length <= MAX_TOPIC_CHARS && t.split(" ").length <= MAX_TOPIC_WORDS
    )
    .filter((t) => !STOP_WORDS.has(t));

  const unique = Array.from(new Set(cleaned));

  // Drop a general word when a more specific one on the same link already
  // covers it: "design" goes when "web design" is there. Word-level
  // comparison, so "css" is never eaten by "scss".
  const words = (t: string) => t.split(/[\s-]+/);
  const kept = unique.filter(
    (a) =>
      !unique.some(
        (b) =>
          b !== a &&
          words(b).length > words(a).length &&
          words(a).every((w) => words(b).includes(w))
      )
  );

  return kept.slice(0, MAX_TOPICS);
}

/**
 * The leash: the vocabulary the prompt asks the model to reuse. Built from
 * the collection's existing topics through the same policy above, so the
 * leash never hands yesterday's noise back to the model. A word enters the
 * leash only once two links carry it, and is shown with its headcount so
 * the model can feel which words are established.
 */
export function buildLeash(
  rowsTopics: (string[] | null)[],
  limit = 150
): string[] {
  const counts = new Map<string, number>();
  for (const topics of rowsTopics) {
    for (const t of applyTopicPolicy(topics ?? [])) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t, n]) => `${t} (${n})`);
}
