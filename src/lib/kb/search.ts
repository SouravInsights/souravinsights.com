import { and, asc, cosineDistance, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, linkChunks } from "@/db/schema";
import { embedOne } from "./embed";

/**
 * Semantic search over the knowledge base.
 *
 * Vector search returns the nearest *passages*, but a user wants *links*. Left
 * raw, the top 8 passages could all be one article, so we group passages by
 * link and rank the links by their closest passage.
 *
 * Two things this file learned the hard way:
 *
 * 1. **Long articles must not own the pool.** `article` and `tool` links carry
 *    ~12 passages each while `people`, `publication`, `inspiration`, `directory`
 *    and `learning` carry exactly ONE (their summary) — 94% of all vectors are
 *    article/tool chunks. With a shallow pool of 60 passages, a couple of long
 *    articles filled it and a gallery could not appear no matter how relevant:
 *    measured, "galleries for real app motion" ranked 60fps.design FIRST among
 *    passages, yet it never reached the agent. So: a deeper pool, and at most
 *    MAX_PASSAGES_PER_LINK passages from any one link.
 *
 * 2. **Summaries deserve their own race.** Every link has exactly one summary
 *    passage, so a ranking over summaries alone compares every link fairly —
 *    one vector each, no category buried under another's bulk. The two
 *    rankings (all passages, summaries only) are fused: a link's score is its
 *    best similarity wherever it earned it.
 *
 * Ranking is similarity alone — the collection gets too few likes for a
 * popularity signal to mean anything.
 */

/** How many candidate passages to pull before grouping into links. */
const CANDIDATE_PASSAGES = 200;
/** One link may contribute at most this many passages to the pool. */
const MAX_PASSAGES_PER_LINK = 3;
/** How many summary passages to pull for the fair-comparison ranking. */
const SUMMARY_CANDIDATES = 120;

const DEFAULT_LINKS = 8;
const DEFAULT_PASSAGES_PER_LINK = 3;

export interface SearchHit {
  urlKey: string;
  url: string;
  title: string;
  category: string | null;
  /** 1 − cosine distance. Higher is more relevant. */
  score: number;
  /** The best passages from this link, most relevant first. */
  passages: { content: string; chunkIndex: number }[];
}

interface CandidateRow {
  linkId: number;
  urlKey: string;
  url: string;
  title: string;
  category: string | null;
  content: string;
  chunkIndex: number;
  unitType: string;
  distance: number;
}

export async function search(
  query: string,
  opts: {
    /** Restrict the search to one category — "who to follow" is about people. */
    category?: string;
    limit?: number;
    passagesPerLink?: number;
    /** Scope the search to one link's passages (the reader's per-article ask). */
    linkId?: number;
  } = {}
): Promise<SearchHit[]> {
  const limit = opts.limit ?? DEFAULT_LINKS;
  const passagesPerLink = opts.passagesPerLink ?? DEFAULT_PASSAGES_PER_LINK;

  const queryVector = await embedOne(query);
  const distance = sql<number>`${cosineDistance(
    linkChunks.embedding,
    queryVector
  )}`;

  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (opts.category) conditions.push(eq(links.category, opts.category));
  if (opts.linkId) conditions.push(eq(linkChunks.linkId, opts.linkId));

  const columns = {
    linkId: links.id,
    urlKey: links.urlKey,
    url: links.url,
    title: links.title,
    category: links.category,
    content: linkChunks.content,
    chunkIndex: linkChunks.chunkIndex,
    unitType: linkChunks.unitType,
    distance,
  };

  const nearest = (onlySummaries: boolean, take: number) =>
    db
      .select(columns)
      .from(linkChunks)
      .innerJoin(links, eq(links.id, linkChunks.linkId))
      .where(
        and(
          ...conditions,
          ...(onlySummaries ? [eq(linkChunks.unitType, "summary")] : [])
        )
      )
      .orderBy(asc(distance))
      .limit(take) as Promise<CandidateRow[]>;

  // Both races at once: everything, and the fair one over summaries.
  const [allPassages, summaryPassages] = await Promise.all([
    nearest(false, CANDIDATE_PASSAGES),
    nearest(true, SUMMARY_CANDIDATES),
  ]);

  // Group by link. A link's score is its best passage from either race, and
  // its cited passages are the best few from its own pool.
  const grouped = new Map<
    number,
    { hit: SearchHit; best: number; passages: CandidateRow[] }
  >();

  const consider = (row: CandidateRow) => {
    let entry = grouped.get(row.linkId);
    if (!entry) {
      entry = {
        best: Number(row.distance),
        passages: [],
        hit: {
          urlKey: row.urlKey,
          url: row.url,
          title: row.title || row.url,
          category: row.category,
          score: 1 - Number(row.distance),
          passages: [],
        },
      };
      grouped.set(row.linkId, entry);
    }
    entry.best = Math.min(entry.best, Number(row.distance));
    entry.hit.score = 1 - entry.best;
    entry.passages.push(row);
  };

  // The flood guard: at most MAX_PASSAGES_PER_LINK from the all-passages race,
  // so one 12-chunk article cannot crowd out every other link.
  const perLink = new Map<number, number>();
  for (const row of allPassages) {
    const used = perLink.get(row.linkId) ?? 0;
    if (used >= MAX_PASSAGES_PER_LINK) continue;
    perLink.set(row.linkId, used + 1);
    consider(row);
  }
  // Summaries are the fair race: every link gets its one shot.
  for (const row of summaryPassages) consider(row);

  return Array.from(grouped.values())
    .sort((a, b) => a.best - b.best)
    .slice(0, limit)
    .map((entry) => {
      entry.passages.sort((a, b) => a.distance - b.distance);
      entry.hit.passages = entry.passages
        .slice(0, passagesPerLink)
        .map((row) => ({ content: row.content, chunkIndex: row.chunkIndex }));
      return entry.hit;
    });
}
