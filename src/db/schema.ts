import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
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
    // Raw intake note (the Discord channel). Null for non-Discord intake.
    channel: text("channel"),
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
    /** Palette index (highlight-wave HUES). The colour IS the mark's meaning. */
    hue: smallint("hue").notNull().default(3),
    /** Anchor lost after a re-read: hidden, never deleted. */
    stale: boolean("stale").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("highlights_link_id_idx").on(table.linkId)]
);

/**
 * The gallery's projects — one row per side project a clip belongs to. Here
 * rather than in the repo because the repo is public and this is content: the
 * gallery can gain a project without a deploy.
 */
export const galleryProjects = pgTable("gallery_projects", {
  // Short stable id, also the R2 folder name (`spotfree`, `beenthere`).
  key: text("key").primaryKey(),
  // Shown on the filter chip and above a clip's title.
  name: text("name").notNull(),
  // Where clicking the project goes. Null when it has no public site.
  url: text("url"),
  // Order in the filter row. Lower first; the id is only a label.
  position: integer("position").notNull().default(0),
});

/**
 * One row per clip.
 *
 * Everything about a clip lives here, its Cloudflare R2 keys included, so the
 * open-source repo holds no content and no bucket layout — only the code that
 * reads this table. `video_key` / `poster_key` are object keys relative to the
 * bucket (`<project>/<file>`); the public base is an env var, never committed.
 *
 * The facts about the file (dimensions, duration) are written once when it is
 * registered; title, notes and tags are the parts edited in the UI.
 */
export const galleryVideos = pgTable(
  "gallery_videos",
  {
    // Stable id, also the clip's filename stem on R2. Used in like/view keys.
    id: text("id").primaryKey(),
    // The project this clip belongs to (`gallery_projects.key`).
    project: text("project")
      .notNull()
      .references(() => galleryProjects.key, { onDelete: "cascade" }),
    // R2 object key of the video, e.g. `spotfree/spotfree-icon-animations.mp4`.
    videoKey: text("video_key").notNull(),
    // R2 object key of the still shown before the video loads (`…-poster.webp`).
    posterKey: text("poster_key").notNull(),
    // Detail-view heading. Edited in the UI.
    title: text("title").notNull().default(""),
    // The paragraph under the title. Edited in the UI.
    notes: text("notes").notNull().default(""),
    // Free-form labels shown as chips. Edited in the UI.
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Intrinsic video pixels. Let the frame reserve its space before load.
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // Seconds. Shown before the video's metadata arrives.
    duration: doublePrecision("duration").notNull(),
    // Whether the file has an audio track worth a mute control.
    hasAudio: boolean("has_audio").notNull().default(false),
    // When the interaction was recorded. Shown as `Nov 2025`.
    recordedAt: date("recorded_at"),
    // Curated order in the gallery. Lower first; not implied by any date.
    position: integer("position").notNull().default(0),
    // Row inserted.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Last edit to title/notes/tags. Lets a save be visible and ordered.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("gallery_videos_project_idx").on(table.project, table.position),
  ]
);

/**
 * Shared chat sessions. A conversation is stored whole — the role, the text and
 * the links each answer used — because a link that renders the same answer
 * months later is the point: the collection changes underneath it, but the
 * answer someone shared should not.
 *
 * Read-only and public by id; ids are random, so a session is only reachable by
 * whoever holds the link. Nothing here is indexed for search.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    /** The first question, for a title. */
    title: text("title").notNull().default(""),
    /** UIMessage[] — parts, not prose, so citations survive the round trip. */
    messages: jsonb("messages").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("conversations_created_at_idx").on(table.createdAt)]
);
