import { generateObject } from "ai";
import { z } from "zod";
import { chatModel } from "./model";
import { search } from "./search";

/**
 * The Writing Desk: given what you are writing, find the saved links that back
 * it — the "15 tabs" problem turned into one call.
 *
 * The shape of the job:
 *   1. split the draft into its separate claims,
 *   2. search the collection once per claim,
 *   3. merge the hits by link and keep the best ones,
 *   4. have the model say, in one line, what each one supports.
 *
 * Step 1 is not decoration. A paragraph holds several assertions, and embedding
 * the whole thing averages them into a blur — the same reason pages get chunked
 * rather than embedded whole. Searching per claim keeps every vector sharp.
 *
 * Step 4 is where a citation tool usually goes wrong: it invents a source. Here
 * the model may only label links it was handed (the `urlKey`s are a zod enum),
 * so a made-up source has nowhere to appear.
 */

/** Claims shorter than this get merged into a neighbour — too thin to search. */
const MIN_CLAIM_CHARS = 40;
/** Most claims to search. Bounds the cost of a long pasted draft. */
const MAX_CLAIMS = 8;
/** Links retrieved per claim, before merging. */
const PER_CLAIM = 3;
/** Fragments shorter than this can't usefully be quoted. */
const MIN_FRAGMENT_CHARS = 80;
/**
 * Below this, a match shares a topic rather than supporting anything — and the
 * model will still write a confident reason to cite it, so weak candidates must
 * never reach the prompt.
 *
 * 0.45, not the eval's 0.35. The two questions differ: the eval asks "is this in
 * the collection at all", the Desk asks "does this passage back this claim".
 * Measured on two drafts — one about RAG internals the collection cannot support,
 * one about nested corner radii it can — the noise sat at 0.35–0.44 and the
 * genuine supports at 0.53 and 0.63. The line goes in that gap.
 *
 * The consequence is deliberate: a draft the collection cannot back returns an
 * empty list. That is the honest answer, and better than a stretched citation.
 */
const SCORE_FLOOR = 0.45;
/** Cap on what we hand back, including to the model. */
const MAX_SUGGESTIONS = 10;

/**
 * Split a draft into the claims worth searching for.
 *
 * Sentence boundaries only — no clever parsing. Short pieces are merged forward
 * so a heading or a one-word line doesn't become its own query. When a draft has
 * more claims than we'll search, the longest ones win: they carry the content,
 * and the opening lines of a draft are usually framing.
 */
export function splitClaims(draft: string): string[] {
  const sentences = draft
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const claims: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    buffer = buffer ? `${buffer} ${sentence}` : sentence;
    if (buffer.length >= MIN_CLAIM_CHARS) {
      claims.push(buffer);
      buffer = "";
    }
  }
  if (buffer) claims.push(buffer); // whatever is left over is still a claim

  if (claims.length <= MAX_CLAIMS) return claims;

  const keep = new Set(
    [...claims].sort((a, b) => b.length - a.length).slice(0, MAX_CLAIMS)
  );
  return claims.filter((claim) => keep.has(claim)); // original order
}

export interface CitationSuggestion {
  urlKey: string;
  url: string;
  title: string;
  channel: string;
  /** The passage from the saved page that matched. */
  passage: string;
  /** The line in your draft this speaks to. */
  claim: string;
  /** The model's one-line reason, grounded in the passage. */
  why: string;
}

export interface DeskResult {
  /** The claims we searched for, in draft order. */
  claims: string[];
  suggestions: CitationSuggestion[];
  /** Links that matched but were judged not to support the draft. */
  dropped: number;
}

/**
 * Find the fragments in the collection that back what a draft is saying.
 *
 * Never throws on "nothing found" — an empty list is a valid, honest answer, and
 * the writer needs to see it rather than a made-up source.
 */
export async function findCitations(draft: string): Promise<DeskResult> {
  const claims = splitClaims(draft);
  if (claims.length === 0) return { claims: [], suggestions: [], dropped: 0 };

  const perClaim = await Promise.all(
    claims.map((claim) => search(claim, { limit: PER_CLAIM }))
  );

  // Merge by link: one link can match several claims, so keep its best match and
  // remember which claim (and passage) produced it.
  const byLink = new Map<string, CitationSuggestion & { score: number }>();
  for (let i = 0; i < claims.length; i++) {
    for (const hit of perClaim[i]) {
      // Below the floor it's topic-adjacency, not support.
      if (hit.score < SCORE_FLOOR) continue;

      const passage = hit.passages[0]?.content ?? "";
      if (passage.length < MIN_FRAGMENT_CHARS) continue; // nothing to quote

      const existing = byLink.get(hit.urlKey);
      if (existing && existing.score >= hit.score) continue;

      byLink.set(hit.urlKey, {
        urlKey: hit.urlKey,
        url: hit.url,
        title: hit.title,
        channel: hit.channel,
        passage,
        claim: claims[i],
        why: "",
        score: hit.score,
      });
    }
  }

  const candidates = Array.from(byLink.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);

  if (candidates.length === 0) return { claims, suggestions: [], dropped: 0 };

  // The model may only label links it was handed — the enum is the guarantee.
  const urlKeys = candidates.map((c) => c.urlKey) as [string, ...string[]];

  const { object } = await generateObject({
    model: chatModel(),
    schema: z.object({
      picks: z
        .array(
          z.object({
            urlKey: z.enum(urlKeys),
            why: z
              .string()
              .describe("One line: what this supports in the draft"),
          })
        )
        .max(MAX_SUGGESTIONS),
    }),
    prompt:
      `A writer is drafting this:\n\n"""\n${draft}\n"""\n\n` +
      `Semantic search matched these fragments from their saved collection:\n\n` +
      candidates
        .map(
          (c) =>
            `- urlKey: ${c.urlKey}\n  title: ${c.title}\n  channel: ${c.channel}\n  fragment: ${c.passage}`
        )
        .join("\n\n") +
      `\n\nFor each fragment that supports, illustrates or argues with a specific ` +
      `claim in the draft, write one short line (max ~15 words) saying what it ` +
      `backs. Use only the fragments above, and judge strictly: sharing a topic ` +
      `with the draft is not support. If a fragment merely touches the same ` +
      `subject without backing a claim, drop it. A short list — or an empty one — ` +
      `is a correct answer. A stretched citation is worse than none.`,
  });

  // Keep the model's order: it may rank by usefulness, not by similarity.
  const picked = new Map(object.picks.map((p) => [p.urlKey, p.why]));
  const suggestions = candidates
    .filter((c) => picked.has(c.urlKey))
    .map(({ score, ...rest }) => ({ ...rest, why: picked.get(rest.urlKey)! }));

  return { claims, suggestions, dropped: candidates.length - suggestions.length };
}

