import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { links } from "@/db/schema";

/** One row of the collection, as stored. */
export interface LinkRecord {
  id: number;
  urlKey: string;
  discordId: string | null; // snowflake string; also the Redis like key
  url: string;
  title: string;
  description: string;
  category: string | null;
  summary: string | null;
  topics: string[] | null;
  addedAt: Date;
}

/** The raw Drizzle read. Call `getLinks` instead — it adds the cache. */
async function selectLinks(category?: string): Promise<LinkRecord[]> {
  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (category) conditions.push(eq(links.category, category));

  const rows = await db
    .select({
      id: links.id,
      urlKey: links.urlKey,
      discordId: links.discordId,
      url: links.url,
      title: links.title,
      description: links.description,
      category: links.category,
      summary: links.summary,
      topics: links.topics,
      addedAt: links.addedAt,
    })
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.addedAt), desc(links.id));

  // BigInt -> string: like keys and JSON responses both want strings.
  return rows.map((row) => ({
    ...row,
    discordId: row.discordId === null ? null : row.discordId.toString(),
  }));
}

/**
 * Next caches `fetch`, but not an ORM call — so a Drizzle query over Postgres
 * runs on every request. `unstable_cache` is Next's documented way to give a
 * non-`fetch` read the same treatment: the query runs once per revalidate window
 * and later requests are answered from the cache.
 * https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 *
 * The arguments are folded into the cache key automatically, so the full list
 * and a single category are cached as separate entries.
 */
const getLinksCached = unstable_cache(
  async (category: string | undefined) => {
    const rows = await selectLinks(category);
    // A Date does not survive the cache's JSON round-trip, so it is stored as a
    // timestamp here and revived by `getLinks` below.
    return rows.map((row) => ({ ...row, addedAt: row.addedAt.getTime() }));
  },
  ["links"],
  { revalidate: 300, tags: ["links"] }
);

/**
 * The one read path for the collection, now served from the data cache. Site
 * (page, RSS, llms-full, homepage) and the public API both use this, so they can
 * never drift apart. Invariant: hidden and machine-dead rows never escape.
 */
export async function getLinks(opts?: {
  /** The public filter axis. `channel` stays on the row as an intake note. */
  category?: string;
}): Promise<LinkRecord[]> {
  const rows = await getLinksCached(opts?.category);
  return rows.map((row) => ({ ...row, addedAt: new Date(row.addedAt) }));
}
