import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

/**
 * One row per URL, recorded when it entered the collection. Discord is intake,
 * not storage — this is the home that never forgets. Full reasoning per column:
 * docs/spec/links-registry-and-api.md
 */
export const links = pgTable(
  "links",
  {
    id: bigint("id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),

    // identity
    source: text("source").notNull().default("discord"),
    // Snowflake as JS BigInt: u64 exceeds Number.MAX_SAFE_INTEGER. Doubles as
    // the Redis like key — converted to string at read boundaries.
    discordId: bigint("discord_id", { mode: "bigint" }).unique(),
    urlKey: text("url_key").notNull().unique(),
    url: text("url").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    channel: text("channel").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull(),

    // visibility & health
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    health: text("health").notNull().default("unknown"),
    consecutiveFailures: smallint("consecutive_failures").notNull().default(0),
    healthCheckedAt: timestamp("health_checked_at", { withTimezone: true }),

    // extraction (KB)
    extractStatus: text("extract_status").notNull().default("pending"),
    rawText: text("raw_text"),
    contentHash: text("content_hash"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("links_url_nonempty", sql`${table.url} <> ''`),
    check(
      "links_health_check",
      sql`${table.health} in ('unknown','alive','dying','dead','uncheckable')`
    ),
    check(
      "links_extract_status_check",
      sql`${table.extractStatus} in ('pending','ok','thin','failed','skipped')`
    ),
    index("links_channel_added_idx").on(
      table.channel,
      table.addedAt.desc(),
      table.id.desc()
    ),
  ]
);

/** Citable passages + embeddings per link. Filled by the KB extraction step. */
export const linkChunks = pgTable(
  "link_chunks",
  {
    id: bigint("id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    linkId: bigint("link_id", { mode: "number" })
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    chunkIndex: smallint("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: smallint("token_count").notNull().default(0),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (table) => [
    unique("link_chunks_link_chunk_unique").on(table.linkId, table.chunkIndex),
    index("link_chunks_link_id_idx").on(table.linkId),
    index("link_chunks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);
