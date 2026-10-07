import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";

/**
 * The one read path for the collection. Site (page, RSS, llms-full, homepage)
 * and the public API both use this, so they can never drift apart. Invariant:
 * hidden and machine-dead rows never escape.
 */
export interface LinkRecord {
  id: number;
  urlKey: string;
  discordId: string | null; // snowflake string; also the Redis like key
  url: string;
  title: string;
  description: string;
  channel: string;
  addedAt: Date;
}

export async function getLinks(opts?: {
  channel?: string;
}): Promise<LinkRecord[]> {
  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (opts?.channel) conditions.push(eq(links.channel, opts.channel));

  const rows = await db
    .select({
      id: links.id,
      urlKey: links.urlKey,
      discordId: links.discordId,
      url: links.url,
      title: links.title,
      description: links.description,
      channel: links.channel,
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
