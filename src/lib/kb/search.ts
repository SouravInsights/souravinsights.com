import { and, asc, cosineDistance, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { links, linkChunks } from "@/db/schema";
import { embedOne } from "./embed";

/**
 * Semantic search over the knowledge base.
 *
 * Vector search returns the nearest *passages*, but a user wants *links*. Left
 * raw, the top 8 passages could all be one article, so we:
 *   1. fetch the nearest passages,
 *   2. group them by link (keep the best few per link),
 *   3. rank the links by their closest passage.
 *
 * Ranking is similarity alone — the collection gets too few likes for a
 * popularity signal to mean anything.
 */

/** How many candidate passages to pull before grouping into links. */
const CANDIDATE_PASSAGES = 60;
const DEFAULT_LINKS = 8;
const DEFAULT_PASSAGES_PER_LINK = 3;

export interface SearchHit {
  urlKey: string;
  url: string;
  title: string;
  channel: string;
  /** 1 − cosine distance. Higher is more relevant. */
  score: number;
  /** The best passages from this link, most relevant first. */
  passages: { content: string; chunkIndex: number }[];
}

export async function search(
  query: string,
  opts: { channel?: string; limit?: number; passagesPerLink?: number } = {}
): Promise<SearchHit[]> {
  const limit = opts.limit ?? DEFAULT_LINKS;
  const passagesPerLink = opts.passagesPerLink ?? DEFAULT_PASSAGES_PER_LINK;

  const queryVector = await embedOne(query);
  const distance = sql<number>`${cosineDistance(
    linkChunks.embedding,
    queryVector
  )}`;

  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (opts.channel) conditions.push(eq(links.channel, opts.channel));

  const rows = await db
    .select({
      linkId: links.id,
      urlKey: links.urlKey,
      url: links.url,
      title: links.title,
      channel: links.channel,
      content: linkChunks.content,
      chunkIndex: linkChunks.chunkIndex,
      distance,
    })
    .from(linkChunks)
    .innerJoin(links, eq(links.id, linkChunks.linkId))
    .where(and(...conditions))
    .orderBy(asc(distance))
    .limit(CANDIDATE_PASSAGES);

  // Group: one entry per link, ranked by its best (smallest) distance.
  const grouped = new Map<number, { hit: SearchHit; best: number }>();
  for (const row of rows) {
    const d = Number(row.distance);
    let entry = grouped.get(row.linkId);
    if (!entry) {
      entry = {
        best: d,
        hit: {
          urlKey: row.urlKey,
          url: row.url,
          title: row.title || row.url,
          channel: row.channel,
          score: 1 - d,
          passages: [],
        },
      };
      grouped.set(row.linkId, entry);
    }
    if (entry.hit.passages.length < passagesPerLink) {
      entry.hit.passages.push({ content: row.content, chunkIndex: row.chunkIndex });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.best - b.best)
    .slice(0, limit)
    .map((entry) => entry.hit);
}
