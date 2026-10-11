import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

/**
 * One row per URL, recorded when it entered the collection. Discord is one
 * intake, not an identity — `url_key` is. Reasoning: docs/spec/insights-rebuild.md
 */
export const links = pgTable(
  "links",
  {
    id: bigint("id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),

    // identity
    source: text("source").notNull().default("discord"),
    // A note about how the link arrived. Nothing queries by it.
    discordId: bigint("discord_id", { mode: "bigint" }).unique(),
    urlKey: text("url_key").notNull().unique(),
    url: text("url").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    // Raw intake note. Nothing groups by it — the page groups by `category`.
    channel: text("channel").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull(),

    // visibility & health
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    health: text("health").notNull().default("unknown"),
    consecutiveFailures: smallint("consecutive_failures").notNull().default(0),
    healthCheckedAt: timestamp("health_checked_at", { withTimezone: true }),

    // read (defuddle)
    readStatus: text("read_status").notNull().default("pending"),
    markdown: text("markdown"),
    wordCount: integer("word_count"),
    contentHash: text("content_hash"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),

    // understand (classify → describe)
    category: text("category"),
    topics: text("topics").array(),
    summary: text("summary"),
    embeddingMode: text("embedding_mode"),
    promptVersion: smallint("prompt_version"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),

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
      "links_read_status_check",
      sql`${table.readStatus} in ('pending','ok','thin','failed')`
    ),
    check(
      "links_embedding_mode_check",
      sql`${table.embeddingMode} in ('full','summary')`
    ),
    index("links_channel_added_idx").on(
      table.channel,
      table.addedAt.desc(),
      table.id.desc()
    ),
    index("links_category_idx").on(table.category),
  ]
);

/** Citable passages + embeddings per link. Filled by the embed stage. */
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
    /** summary | prose | code — summaries are first class, code is filterable. */
    unitType: text("unit_type").notNull().default("prose"),
    /** The section this passage came from (ATX heading path). */
    heading: text("heading"),
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

/** The owner's highlights on articles opened in the reader. Public to read. */
export const highlights = pgTable(
  "highlights",
  {
    id: bigint("id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    linkId: bigint("link_id", { mode: "number" })
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    /** The highlighted words, verbatim. */
    quote: text("quote").notNull(),
    /** Anchoring context, so a highlight re-finds its spot after a re-read. */
    prefix: text("prefix").notNull().default(""),
    suffix: text("suffix").notNull().default(""),
    /** Which occurrence of `quote` it was — quotes repeat. */
    occurrence: smallint("occurrence").notNull().default(0),
    /** Anchor lost after a re-read: hidden, never deleted. */
    stale: boolean("stale").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("highlights_link_id_idx").on(table.linkId)]
);
