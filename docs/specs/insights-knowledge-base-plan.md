# Insights Knowledge Base — Brainstorming & Build Plan

> **Status:** Draft — June 2025
>
> Transforming the `/curated-links` page from a static link collection into a **semantic knowledge base** with vector search, content enrichment, and MCP server integration.

---

## Part I: Brainstorming & Ideas

### Where it all started

The insights page (`/curated-links`) is essentially a graveyard of good intentions. Hundreds of links — articles, tools, products, portfolios, design inspiration, career resources — all dumped from Discord channels into a beautifully themed card grid. People visit, scroll, maybe click one or two, and leave. The page is doing the bare minimum: *displaying*. It's not *thinking*.

The core realization: **this collection is not just a list — it's a knowledge graph waiting to happen.** Every link represents a fragment of an idea, a tool that solved a problem, an article that shifted a perspective. Together, they form a web of interconnected thinking that's currently invisible.

### The writing problem

When sitting down to write a new article, the process is always the same: stare at a blank page, pull up 15 browser tabs of "related stuff I've read before," try to piece together a framework from memory. The insights collection *contains* the raw material for deep, well-referenced writing — but there's no way to surface it.

Imagine this workflow:
1. You have a half-formed instinct: *"I want to write about why design systems fail at scale"*
2. You type that into a search bar
3. The system pulls from your entire collection: articles about component architecture, case studies of design system failures, tools that solve scaling problems, portfolios of companies that got it right
4. You have 20 reference points in 3 seconds instead of 20 minutes of digging

**This isn't just useful for writing articles.** It's useful for:
- Preparing for a talk or presentation
- Answering "what do you think about X?" in conversations
- Finding the right tool when starting a new project
- Connecting dots between seemingly unrelated ideas
- Giving visitors to your site a genuinely useful exploration tool

### The MCP dimension

Beyond the public page, there's a private dimension: **your own AI agents should have access to this collection.**

When you're in Claude, Cursor, or any AI-assisted workflow, you should be able to say *"find me references about [topic]"* and have your agent pull from YOUR curated collection — not the general web. This turns your personal knowledge base into a **reusable context layer** that enhances every AI interaction.

An MCP server that exposes `search_insights`, `get_related_links`, and `browse_by_category` as tools means your collection becomes a **persistent, queryable memory** that travels with you across all your AI-powered workflows.

### What "semantic search" really means

The key insight (pun intended): **exact keyword matching is not enough.**

When you search for "how to make websites faster," you should get results about:
- Core Web Vitals and Lighthouse optimization
- Image compression and lazy loading techniques
- CDN strategies and edge caching
- React performance patterns (code splitting, memoization)
- Server-side rendering vs. static generation debates

None of those results contain the phrase "make websites faster," but they're all deeply relevant. **Semantic search understands intent and meaning**, not just characters.

This is achieved through **vector embeddings** — mathematical representations of text that capture meaning. Similar ideas cluster together in vector space, even if they use completely different words.

### The "digital garden" evolution

Your page is already called a "digital garden" in the metadata. A real garden isn't just plants in rows — it's an ecosystem with connections, growth, and emergent patterns. The current page is more like a seed catalog.

The evolution:
- **Current:** Static cards in tabs, no connections between ideas
- **Phase 1:** Searchable — visitors can find what they're looking for
- **Phase 2:** Connected — each link reveals its neighbors, showing the web of ideas
- **Phase 3:** Intelligent — the system suggests connections you didn't know existed
- **Phase 4:** Agent-accessible — your AI tools can query and reason over your collection

### The side project within the side project

There's a meta-pleasure here: **the insights page becomes a side project that enhances other side projects.** Every article you write, every tool you build, every idea you explore benefits from having a richer, more connected knowledge base.

It's self-reinforcing:
- You curate more links → the knowledge base grows
- The knowledge base grows → searching becomes more valuable
- Searching becomes more valuable → you write better articles
- You write better articles → you discover more links to curate

---

## Part II: Build Plan

### Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [Current Architecture](#2-current-architecture)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Phase 1 — pgvector & Embeddings Infrastructure](#4-phase-1--pgvector--embeddings-infrastructure)
5. [Phase 2 — Embedding Pipeline & Background Jobs](#5-phase-2--embedding-pipeline--background-jobs)
6. [Phase 3 — Semantic Search API](#6-phase-3--semantic-search-api)
7. [Phase 4 — Content Enrichment](#7-phase-4--content-enrichment)
8. [Phase 5 — MCP Server (Remote HTTP)](#8-phase-5--mcp-server-remote-http)
9. [Phase 6 — Public Search UI](#9-phase-6--public-search-ui)
10. [Phase 7 — Related Links & Topic Clustering](#10-phase-7--related-links--topic-clustering)
11. [Dependencies & Environment Variables](#11-dependencies--environment-variables)
12. [File Map](#12-file-map)
13. [Testing Strategy](#13-testing-strategy)
14. [Migration & Rollout](#14-migration--rollout)
15. [Open Questions](#15-open-questions)

---

## 1. Vision & Problem Statement

### The Problem
The `/curated-links` page currently displays ~800+ links fetched from 8 Discord channels. It's a flat, browsable list — useful for scrolling, but not for **retrieving knowledge**. When you sit down to write an article, you want to pull from the accumulated wisdom of years of curated links. You can't do that with a tabbed card grid.

### The Vision
Turn the insights page into a **queryable knowledge base** that:

1. **Semantic Search** — Understands the *meaning* of a query, not just keywords. "How design systems handle component composition" should surface articles about atomic design, token systems, and headless UI — even if none of those exact words appear.
2. **Content Enrichment** — Fetches and summarizes page content for richer embedding signal, not just titles/descriptions.
3. **MCP Server** — Exposes the knowledge base as a remote MCP tool, so any AI agent (Claude, Cursor, custom agents) can query your collection during workflows like writing, research, or brainstorming.
4. **Public Search** — A search bar on the `/curated-links` page that visitors can use to explore your collection semantically.
5. **Related Links** — Each card/link shows contextually similar links, creating a web of interconnected ideas.
6. **Topic Clusters** — Emergent topic groupings that reveal patterns across your collection.

---

## 2. Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Discord API    │────▶│  Trigger.dev Job  │────▶│  Neon Postgres│
│  (8 channels)   │     │  (polls every 5m) │     │  (curated_    │
└─────────────────┘     └──────────────────┘     │   links table)│
                                                  └──────┬───────┘
                                                         │
                    ┌──────────────────┐                 │
                    │  Next.js Page    │◀────────────────┘
                    │  /curated-links  │    (server component,
                    │  (60s revalidate)│     fetches Discord +
                    └──────────────────┘     renders client tabs)
```

### Key Files
| File | Purpose |
|------|---------|
| `src/app/curated-links/page.tsx` | Server component, fetches Discord data |
| `src/app/curated-links/components/CuratedLinksTabs.tsx` | Client component with tabs, search, admin |
| `src/app/curated-links/utils/discordApi.ts` | Discord REST API client |
| `src/db/schema.ts` | Drizzle schema (curatedLinks, favoriteLinks) |
| `src/db/index.ts` | Neon HTTP + Drizzle client |
| `src/trigger/discord-links.ts` | Background job polling Discord |
| `src/app/api/curated-links/route.ts` | CRUD API for curated links |

### Current Data Model
```typescript
// curatedLinks table — ONLY contains manually curated links (with notes/stars)
{
  id: serial (PK)
  title: text
  url: text
  description: text
  category: varchar(100)    // discord channel name
  notes: text               // admin annotations (sparse — most links have no notes)
  creatorTwitter: varchar(100)
  clickCount: integer
  newsletterStatus: varchar(20)
  buttondownEmailId: varchar(100)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### The Problem with Current Schema

**~800+ Discord links are NOT stored in the database.** They're fetched live from the Discord API at request time and rendered directly. Only links you manually curate (add notes, star) end up in `curated_links`.

This means:
- The search system as previously planned would only search ~20-30 curated links
- Missing 95%+ of the collection
- The knowledge base would be nearly useless

### Current Search
```typescript
// Only matches title or URL, no UI exposed
const filterLinks = (links: LinkData[]) => {
  return links.filter(
    (link) =>
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
```

---

## 3. Proposed Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Discord API    │────▶│  Trigger.dev Job  │────▶│  Neon Postgres│
│  (8 channels)   │     │  (polls + embeds) │     │              │
└─────────────────┘     └──────────────────┘     │  all_links    │
                                                  │  link_embeddings│
                    ┌──────────────────┐          │  curated_links│
                    │  Content Fetcher │─────────▶│  (pgvector)  │
                    │  (Jina + Readab.)│          └──────┬───────┘
                    └──────────────────┘                 │
                                                         │
          ┌──────────────────┐                           │
          │  MCP Server      │◀──────────────────────────┤
          │  /api/mcp        │                           │
          │  (mcp-handler)   │                    ┌──────┴───────┐
          └──────────────────┘                    │  Next.js     │
                                                  │  /curated-   │
          ┌──────────────────┐                    │  links       │
          │  AI Agents       │                    │  (search UI) │
          │  (Cursor, Claude)│                    └──────────────┘
          └──────────────────┘
```

### Core Technology Choices
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Vector Storage | pgvector in Neon | Already on Neon; no new infra; Drizzle has native `vector` column support |
| Embedding Model | OpenAI `text-embedding-3-small` | Best quality/cost; 1536 dims; ~$0.02/1M tokens |
| Embedding SDK | Vercel AI SDK (`@ai-sdk/openai`) | Native Vercel integration; clean `embed()` / `embedMany()` API |
| MCP Server | `mcp-handler` package | Vercel's official MCP adapter for Next.js; Streamable HTTP transport |
| Background Jobs | Trigger.dev (existing) | Already in stack; extend existing `check-discord-links` job |
| Search API | Next.js Route Handler | Standard pattern; no new infra |

---

## 4. Phase 1 — Schema Evolution & pgvector Infrastructure

### 4.1 The Core Problem

The search system must work on **every link**, not just curated ones. A link about "microservices architecture" that you shared in Discord 2 years ago — never starred, never annotated — should still surface when someone searches "distributed systems patterns."

Currently, ~800+ Discord links are fetched live from the API and **never stored in Postgres**. Only ~20-30 manually curated links exist in `curated_links`. The search system as previously planned would only search those 20-30 links, missing 95%+ of the collection.

### 4.2 New Schema: `all_links` Table

We need a table that stores **every Discord link**, regardless of curation status. The existing `curated_links` table stays as-is (it has newsletter-specific fields we don't want to lose), and `all_links` becomes the canonical source for search.

**File: `src/db/schema.ts`**

```typescript
import { pgTable, serial, text, timestamp, varchar, integer, boolean, index } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

/**
 * ALL links — every link from Discord, stored permanently.
 * This is the canonical source for search and embeddings.
 * Curation (notes, favorites) is an enrichment, not a filter.
 */
export const allLinks = pgTable("all_links", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  // Source tracking
  source: varchar("source", { length: 50 }).default("discord"),
  discordMessageId: varchar("discord_message_id", { length: 100 }).unique(),
  discordChannelId: varchar("discord_channel_id", { length: 100 }),
  // Curation enrichment (optional — merged from curated_links when applicable)
  notes: text("notes"),
  creatorTwitter: varchar("creator_twitter", { length: 100 }),
  clickCount: integer("click_count").default(0),
  isFavorited: boolean("is_favorited").default(false),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("url_idx").on(table.url),
  index("category_idx").on(table.category),
  index("discord_message_idx").on(table.discordMessageId),
]);

/**
 * Vector embeddings for semantic search.
 * Separate table — allows re-embedding without touching core data.
 */
export const linkEmbeddings = pgTable("link_embeddings", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").references(() => allLinks.id).unique(),
  url: text("url").notNull(),
  content: text("content"),  // enriched content (title + description + notes + fetched article text)
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddedAt: timestamp("embedded_at").defaultNow(),
}, (table) => [
  index("embedding_cosine_idx").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops")
  ),
]);
```

### 4.3 Why Separate Tables (Not Merging into `curated_links`)

| Concern | `all_links` | `curated_links` |
|---------|-------------|-----------------|
| Stores Discord links | All of them | Only curated subset |
| Has newsletter fields | No | Yes (`newsletterStatus`, `buttondownEmailId`) |
| Schema complexity | Simple | More complex |
| Search target | Yes (canonical) | No (display overlay) |
| Admin curation | Optional enrichment | Core purpose |

**The relationship:** When a link in `all_links` also exists in `curated_links` (matched by URL), we merge the curation metadata (notes, favorites) for display. Search always runs against `all_links`.

### 4.4 Enable pgvector Extension

Run in Neon SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.5 Generate Migration

```bash
npx drizzle-kit generate
```

Apply manually in Neon SQL Editor (Drizzle's HTTP driver doesn't support DDL directly).

### 4.6 Seed: Populate `all_links` from Discord

The Discord polling job needs to be updated to **write links to the DB** instead of just fetching them live. We also need a one-time seed job to backfill existing links.

**File: `src/trigger/seed-discord-links.ts`** (one-time job)

```typescript
import { logger } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { allLinks } from "@/db/schema";
import { getChannels, getMessagesFromChannel, extractUrl, extractTitle, extractDescription } from "@/app/curated-links/utils/discordApi";
import { eq } from "drizzle-orm";

export const seedDiscordLinks = async () => {
  logger.info("Starting Discord links seed — backfilling all_links table");

  const channels = await getChannels();
  let insertedCount = 0;
  let skippedCount = 0;

  for (const channel of channels) {
    const messages = await getMessagesFromChannel(channel.id);

    for (const msg of messages) {
      const url = extractUrl(msg.content, msg.embeds);
      const title = extractTitle(msg.embeds);
      const description = extractDescription(msg.embeds);

      if (!url) continue;

      // Skip if already exists (by discord message ID)
      const existing = await db
        .select({ id: allLinks.id })
        .from(allLinks)
        .where(eq(allLinks.discordMessageId, msg.id))
        .limit(1);

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      await db.insert(allLinks).values({
        url,
        title: title || url,
        description: description || null,
        category: channel.name,
        source: "discord",
        discordMessageId: msg.id,
        discordChannelId: channel.id,
      });

      insertedCount++;
    }
  }

  logger.info(`Seed complete: ${insertedCount} inserted, ${skippedCount} skipped`);
  return { insertedCount, skippedCount };
};
```

### 4.7 Update Discord Polling Job to Write to DB

**File: `src/trigger/discord-links.ts`** (modify existing)

The existing job fetches Discord messages and triggers ISR revalidation. We need to also **insert new links into `all_links`**:

```typescript
// After detecting new messages in a channel:
for (const msg of newMessages) {
  const url = extractUrl(msg.content, msg.embeds);
  const title = extractTitle(msg.embeds);
  const description = extractDescription(msg.embeds);

  if (!url) continue;

  await db.insert(allLinks).values({
    url,
    title: title || url,
    description: description || null,
    category: channel.name,
    source: "discord",
    discordMessageId: msg.id,
    discordChannelId: channel.id,
  }).onConflictDoNothing(); // skip if already exists
}

// Then trigger revalidation as before
```

### 4.8 Merge Curated Links into `all_links`

For links that are already in `curated_links` (with notes, favorites), we need to sync them into `all_links` with their curation metadata:

```typescript
// One-time sync: copy curated_links into all_links with enriched metadata
const curated = await db.select().from(curatedLinks);
for (const link of curated) {
  await db.insert(allLinks).values({
    url: link.url,
    title: link.title,
    description: link.description,
    category: link.category,
    source: "admin",
    notes: link.notes,
    creatorTwitter: link.creatorTwitter,
    clickCount: link.clickCount,
  }).onConflictDoNothing();
}
```

### 4.9 Install Dependencies

```bash
npm install @ai-sdk/openai ai @modelcontextprotocol/sdk@1.26.0 mcp-handler zod@3 @mozilla/readability jsdom
```

### 4.10 Environment Variables

```env
# Existing (no change)
DATABASE_URL=postgresql://...
ADMIN_API_KEY=...

# New
OPENAI_API_KEY=sk-...          # For embeddings (text-embedding-3-small)
MCP_API_KEY=<random-secret>    # Bearer token for MCP server auth
JINA_API_KEY=...               # Optional — for higher Jina Reader rate limits
```

---

## 5. Phase 2 — Embedding Pipeline & Background Jobs

### 5.1 Embedding Utility

**File: `src/lib/embedding.ts`**

```typescript
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}

// Combine title + description + notes + content into a single embedding input
export function buildEmbeddingInput(link: {
  title: string;
  description?: string | null;
  notes?: string | null;
  content?: string | null;
}): string {
  const parts = [
    link.title,
    link.description,
    link.notes,
    link.content,
  ].filter(Boolean);
  return parts.join("\n\n");
}
```

### 5.2 Trigger.dev Embedding Job

**File: `src/trigger/embed-links.ts`**

```typescript
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { allLinks, linkEmbeddings } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { generateEmbedding, buildEmbeddingInput } from "@/lib/embedding";
import { fetchPageContent } from "@/lib/contentFetcher";

export const embedLinks = schedules.task({
  id: "embed-links",
  // Run daily or on-demand
  run: async (payload) => {
    logger.info("Starting embedding job");

    // Find ALL links without embeddings — not just curated ones
    const links = await db
      .select({
        id: allLinks.id,
        title: allLinks.title,
        url: allLinks.url,
        description: allLinks.description,
        notes: allLinks.notes,
      })
      .from(allLinks)
      .leftJoin(
        linkEmbeddings,
        eq(allLinks.id, linkEmbeddings.linkId)
      )
      .where(isNull(linkEmbeddings.id));

    logger.info(`Found ${links.length} links to embed`);

    let embeddedCount = 0;
    let failCount = 0;

    for (const link of links) {
      try {
        // Fetch actual page content for richer embeddings
        const content = await fetchPageContent(link.url);

        const inputText = buildEmbeddingInput({
          ...link,
          content,
        });

        const embedding = await generateEmbedding(inputText);

        await db.insert(linkEmbeddings).values({
          linkId: link.id,
          url: link.url,
          content: inputText,
          embedding,
        });

        embeddedCount++;

        // Small delay to avoid OpenAI rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        failCount++;
        logger.error(`Failed to embed link ${link.id}: ${link.title}`, { error });
      }
    }

    logger.info(`Embedded ${embeddedCount}/${links.length} links (${failCount} failed)`);
    return { success: true, embeddedCount, failCount };
  },
});
```

### 5.3 Embed Existing Links

After deploying, run the seed job first to populate `all_links`, then trigger embedding:
```bash
npx trigger dev --run seed-discord-links   # Step 1: populate all_links from Discord
npx trigger dev --run embed-links           # Step 2: embed everything
```

This will process ALL links (not just curated ones) and generate embeddings for them.

### 5.4 Re-embed on New Discord Links

When the Discord polling job detects new messages, it now writes them to `all_links` AND triggers embedding:

```typescript
// In discord-links.ts, after inserting new links:
// Trigger embedding for newly added links
await embedLinks.trigger();
```

**File: `src/app/api/curated-links/route.ts`** (modify POST handler)

```typescript
// After inserting the new link, trigger embedding in background
import { embedLinks } from "@/trigger/embed-links";

// In POST handler, after successful insert:
triggerEmbeddingAsync(result[0].id); // fire-and-forget
```

---

## 6. Phase 3 — Semantic Search API

### 6.1 Search Route Handler

**File: `src/app/api/search-insights/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { allLinks, linkEmbeddings } from "@/db/schema";
import { cosineDistance, desc, gt, sql, eq } from "drizzle-orm";
import { generateEmbedding } from "@/lib/embedding";

const MAX_RESULTS = 20;
const MIN_SIMILARITY = 0.3;

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20"),
      MAX_RESULTS
    );

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Compute cosine similarity and rank — searches ALL links, not just curated
    const similarity = sql<number>`
      1 - (${cosineDistance(linkEmbeddings.embedding, queryEmbedding)})
    `;

    const results = await db
      .select({
        id: allLinks.id,
        title: allLinks.title,
        url: allLinks.url,
        description: allLinks.description,
        category: allLinks.category,
        notes: allLinks.notes,
        similarity,
      })
      .from(linkEmbeddings)
      .innerJoin(allLinks, eq(linkEmbeddings.linkId, allLinks.id))
      .where(gt(similarity, MIN_SIMILARITY))
      .orderBy(desc(similarity))
      .limit(limit);

    return NextResponse.json({
      success: true,
      query,
      results: results.map((r) => ({
        ...r,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
      count: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
```

### 6.2 Rate Limiting

Add basic rate limiting to the search endpoint (optional but recommended for public access):

```typescript
// Simple in-memory rate limiter (or use Upstash Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

### 6.3 Response Format

```json
{
  "success": true,
  "query": "design systems component composition",
  "results": [
    {
      "id": 42,
      "title": "Building Design Systems That Scale",
      "url": "https://...",
      "description": "...",
      "category": "resources",
      "notes": "Great breakdown of atomic design patterns",
      "similarity": 0.87
    }
  ],
  "count": 5
}
```

---

## 7. Phase 4 — Content Enrichment

> **This is the most critical phase.** Since notes are sparse, the search quality depends entirely on how well we extract content from URLs. A weak extractor = a weak knowledge base.

### 7.1 Content Fetcher — Dual Strategy

**Primary: Jina Reader API** — handles JS-rendered pages, returns clean markdown.
**Fallback: @mozilla/readability + jsdom** — for when Jina is down/rate-limited.

**File: `src/lib/contentFetcher.ts`**

```typescript
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const JINA_READER_URL = "https://r.jina.ai";
const MAX_CHARS = 4000; // ~1000 tokens for embedding
const FETCH_TIMEOUT = 15000; // 15s

/**
 * Fetch page content using Jina Reader API (primary).
 * Returns clean markdown extracted from the page.
 * Handles JS-rendered SPAs, complex layouts, etc.
 */
async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${JINA_READER_URL}/${url}`, {
      signal: controller.signal,
      headers: {
        Accept: "text/markdown",
        "X-No-Cache": "true",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const text = await response.text();
    return text.slice(0, MAX_CHARS);
  } catch {
    return null;
  }
}

/**
 * Fallback: Fetch raw HTML and extract via Mozilla Readability.
 * Good for static pages and articles. Doesn't handle JS-rendered content.
 */
async function fetchViaReadability(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SouravInsights/1.0; +https://souravinsights.com)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent) return null;

    return article.textContent.slice(0, MAX_CHARS);
  } catch {
    return null;
  }
}

/**
 * Fetch page content with automatic fallback.
 * Tries Jina Reader first, falls back to Readability.
 * Returns null only if both fail.
 */
export async function fetchPageContent(url: string): Promise<string | null> {
  // Try Jina first — handles JS, returns clean markdown
  const jinaResult = await fetchViaJina(url);
  if (jinaResult && jinaResult.length > 100) return jinaResult;

  // Fallback to Readability — static pages only
  const readabilityResult = await fetchViaReadability(url);
  if (readabilityResult && readabilityResult.length > 100) return readabilityResult;

  return null;
}
```

### 7.2 Enrichment Trigger.dev Job

**File: `src/trigger/enrich-links.ts`**

```typescript
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { allLinks, linkEmbeddings } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { fetchPageContent } from "@/lib/contentFetcher";
import { generateEmbedding, buildEmbeddingInput } from "@/lib/embedding";

export const enrichAndEmbed = schedules.task({
  id: "enrich-and-embed",
  run: async (payload) => {
    logger.info("Starting enrichment + embedding job");

    // Find ALL links without embeddings — not just curated ones
    const links = await db
      .select({
        id: allLinks.id,
        title: allLinks.title,
        url: allLinks.url,
        description: allLinks.description,
        notes: allLinks.notes,
      })
      .from(allLinks)
      .leftJoin(linkEmbeddings, eq(allLinks.id, linkEmbeddings.linkId))
      .where(isNull(linkEmbeddings.id));

    logger.info(`Found ${links.length} links to enrich + embed`);

    let successCount = 0;
    let failCount = 0;

    for (const link of links) {
      try {
        // Fetch page content
        const content = await fetchPageContent(link.url);

        // Build embedding input from all available data
        const inputText = buildEmbeddingInput({
          ...link,
          content,
        });

        // Generate embedding
        const embedding = await generateEmbedding(inputText);

        // Store
        await db.insert(linkEmbeddings).values({
          linkId: link.id,
          url: link.url,
          content: inputText,
          embedding,
        });

        successCount++;
        logger.info(`Embedded: ${link.title} (${successCount}/${links.length})`);

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        failCount++;
        logger.error(`Failed: ${link.title}`, { error });
      }
    }

    logger.info(`Done: ${successCount} embedded, ${failCount} failed`);
    return { success: true, successCount, failCount };
  },
});
```

### 7.2 Why This Matters

Most of your links don't have notes. That means the embedding signal comes almost entirely from:
1. **Title** — usually short, sometimes vague ("Awesome CSS tricks")
2. **Description** — from Discord embed, often truncated
3. **Fetched content** — the actual article body (THIS is what makes or breaks search quality)

Without content extraction, searching "how to handle state in React" won't surface an article titled "Modern前端架构 patterns" even if that article is entirely about React state management. With content extraction, the embedding captures the *substance* of the article, not just its title.

### 7.3 Fallback Strategy

The system has a 3-tier fallback:

1. **Jina Reader** (primary) — tries first, handles JS-rendered pages
2. **Mozilla Readability** (fallback) — if Jina fails/rate-limited, tries static extraction
3. **Metadata only** (last resort) — if both fail, embeds title + description + notes

This means every link gets embedded regardless of content fetch success — but the *quality* of the embedding varies. The enrichment job logs which tier succeeded, so you can monitor and re-try failures later.

---

## 8. Phase 5 — MCP Server (Remote HTTP)

### 8.1 MCP Route Handler

**File: `src/app/api/[transport]/route.ts`**

This follows the `mcp-handler` package pattern for Vercel-deployed Next.js.

```typescript
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { db } from "@/db";
import { allLinks, linkEmbeddings } from "@/db/schema";
import { cosineDistance, desc, gt, sql, eq } from "drizzle-orm";
import { generateEmbedding } from "@/lib/embedding";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// ─── MCP Tool: search_insights ────────────────────────────────
async function searchInsights(query: string, limit?: number) {
  const queryEmbedding = await generateEmbedding(query);
  const similarity = sql<number>`
    1 - (${cosineDistance(linkEmbeddings.embedding, queryEmbedding)})
  `;

  const results = await db
    .select({
      id: allLinks.id,
      title: allLinks.title,
      url: allLinks.url,
      description: allLinks.description,
      category: allLinks.category,
      notes: allLinks.notes,
      similarity,
    })
    .from(linkEmbeddings)
    .innerJoin(allLinks, eq(linkEmbeddings.linkId, allLinks.id))
    .where(gt(similarity, 0.3))
    .orderBy(desc(similarity))
    .limit(limit ?? 10);

  return results.map((r) => ({
    ...r,
    similarity: Math.round(r.similarity * 100) / 100,
  }));
}

// ─── MCP Tool: get_related_links ──────────────────────────────
async function getRelatedLinks(linkId: number, limit?: number) {
  const [sourceLink] = await db
    .select()
    .from(linkEmbeddings)
    .where(eq(linkEmbeddings.linkId, linkId))
    .limit(1);

  if (!sourceLink) return [];

  const similarity = sql<number>`
    1 - (${cosineDistance(linkEmbeddings.embedding, sourceLink.embedding)})
  `;

  const results = await db
    .select({
      id: allLinks.id,
      title: allLinks.title,
      url: allLinks.url,
      description: allLinks.description,
      category: allLinks.category,
      notes: allLinks.notes,
      similarity,
    })
    .from(linkEmbeddings)
    .innerJoin(allLinks, eq(linkEmbeddings.linkId, allLinks.id))
    .where(
      gt(similarity, 0.5)
      // Exclude the source link itself
    )
    .orderBy(desc(similarity))
    .limit(limit ?? 5);

  return results
    .filter((r) => r.id !== linkId)
    .map((r) => ({
      ...r,
      similarity: Math.round(r.similarity * 100) / 100,
    }));
}

// ─── MCP Tool: browse_by_category ─────────────────────────────
async function browseByCategory(category: string, limit?: number) {
  const links = await db
    .select()
    .from(allLinks)
    .where(eq(allLinks.category, category))
    .limit(limit ?? 20);

  return links.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.url,
    description: l.description,
    notes: l.notes,
  }));
}

// ─── MCP Tool: get_link_details ───────────────────────────────
async function getLinkDetails(linkId: number) {
  const [link] = await db
    .select()
    .from(allLinks)
    .where(eq(allLinks.id, linkId))
    .limit(1);

  return link || null;
}

// ─── Handler Setup ────────────────────────────────────────────
const baseHandler = createMcpHandler(
  (server) => {
    // Tool 1: Semantic search
    server.tool(
      "search_insights",
      "Search the curated knowledge base using semantic understanding. " +
      "Finds links relevant to the meaning of your query, not just keyword matches. " +
      "Use this when looking for inspiration, references, or related ideas.",
      {
        query: z.string().describe("Natural language search query"),
        limit: z.number().optional().default(10).describe("Max results (1-20)"),
      },
      async ({ query, limit }) => {
        const results = await searchInsights(query, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }
    );

    // Tool 2: Related links
    server.tool(
      "get_related_links",
      "Find links that are semantically similar to a given link. " +
      "Use this to discover adjacent ideas and build on existing knowledge.",
      {
        linkId: z.number().describe("ID of the source link"),
        limit: z.number().optional().default(5).describe("Max results (1-10)"),
      },
      async ({ linkId, limit }) => {
        const results = await getRelatedLinks(linkId, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }
    );

    // Tool 3: Browse by category
    server.tool(
      "browse_by_category",
      "Browse links in a specific category. " +
      "Categories: reading-list, resources, product-hunt, newsletters, " +
      "fav-portfolios, tools, opportunities, design-inspo.",
      {
        category: z.string().describe("Category name"),
        limit: z.number().optional().default(20).describe("Max results"),
      },
      async ({ category, limit }) => {
        const results = await browseByCategory(category, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }
    );

    // Tool 4: Get link details
    server.tool(
      "get_link_details",
      "Get full details of a specific link by ID, including notes and metadata.",
      {
        linkId: z.number().describe("Link ID"),
      },
      async ({ linkId }) => {
        const link = await getLinkDetails(linkId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(link, null, 2),
            },
          ],
        };
      }
    );
  },
  {},
  { basePath: "/api" }
);

// ─── Auth ──────────────────────────────────────────────────────
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  if (bearerToken !== process.env.MCP_API_KEY) return undefined;

  return {
    token: bearerToken,
    scopes: ["read:insights"],
    clientId: "sourav-agent",
    extra: {},
  };
};

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  requiredScopes: ["read:insights"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST, handler as DELETE };
```

### 8.2 MCP Client Configuration

After deployment, connect from Cursor/Claude Desktop:

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "souravinsights": {
      "url": "https://www.souravinsights.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

Or via `mcp-remote` for Claude Desktop:
```json
{
  "mcpServers": {
    "souravinsights": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://www.souravinsights.com/api/mcp",
        "--header",
        "Authorization:Bearer <MCP_API_KEY>"
      ]
    }
  }
}
```

### 8.3 MCP Tools Summary

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `search_insights` | Semantic search across all links | `query`, `limit?` | Ranked results with similarity scores |
| `get_related_links` | Find similar links to a given link | `linkId`, `limit?` | Semantically adjacent links |
| `browse_by_category` | Browse by channel/category | `category`, `limit?` | Links in that category |
| `get_link_details` | Full details of a specific link | `linkId` | Complete link data |

---

## 9. Phase 6 — Public Search UI

### 9.1 Search Bar Component

**File: `src/app/curated-links/components/SemanticSearch.tsx`**

A new client component that sits above the tabs:

```tsx
// Key features:
// - Search input with debounce (300ms)
// - Calls /api/search-insights?q=... on type
// - Displays results in a dropdown/overlay
// - Click result → opens link
// - Shows similarity percentage
// - "Powered by semantic search" label
// - Toggle between "Semantic" and "Tab browsing" modes
```

### 9.2 Integration with CuratedLinksTabs

Add a search mode toggle to `CuratedLinksTabs.tsx`:

```tsx
// When search mode is active:
// - Hide tab navigation
// - Show search results instead
// - Results are rendered as LinkCards with similarity badge
// - "Back to browsing" button

// When browsing mode is active:
// - Current behavior (tabs, cards, pagination)
```

### 9.3 Search Results Card Variant

Add a `searchResult` variant to `LinkCard.tsx` that shows:
- Normal card content
- Similarity badge (e.g., "87% relevant")
- Source category tag
- Notes preview if available

### 9.4 UX Flow

```
User types query → 300ms debounce → POST /api/search-insights
  ↓
Results appear in overlay below search bar
  ↓
Each result is a card with similarity score
  ↓
Click → opens link in new tab
  ↓
"Find related" button → shows similar links
  ↓
"Back to browsing" → returns to tab view
```

---

## 10. Phase 7 — Related Links & Topic Clustering

### 10.1 Related Links on Card Hover/Expand

When a user clicks or hovers on a card, show a "Related" section below it that fetches from `/api/related-links?linkId=...`.

### 10.2 Topic Clusters (Optional Enhancement)

Use the embeddings to compute topic clusters via k-means or similar, stored as metadata:

```typescript
// Could use a simple approach:
// 1. Compute centroids from embeddings
// 2. Assign each link to nearest centroid
// 3. Name clusters based on most common words in member links
```

This is a stretch goal — the search + related links provide most of the value.

---

## 11. Dependencies & Environment Variables

### New Dependencies

```bash
npm install @ai-sdk/openai ai mcp-handler zod@3 @modelcontextprotocol/sdk@1.26.0 @mozilla/readability jsdom
```

| Package | Purpose |
|---------|---------|
| `@ai-sdk/openai` | OpenAI provider for Vercel AI SDK |
| `ai` | Vercel AI SDK core (`embed`, `embedMany`) |
| `mcp-handler` | Vercel's MCP adapter for Next.js |
| `@modelcontextprotocol/sdk` | MCP protocol SDK |
| `zod` | Schema validation for MCP tools |
| `@mozilla/readability` | Fallback content extraction (Firefox Reader View algorithm) |
| `jsdom` | DOM implementation for Node.js (needed by Readability) |

### Environment Variables

```env
# Existing (no change)
DATABASE_URL=postgresql://...
ADMIN_API_KEY=...

# New
OPENAI_API_KEY=sk-...          # For embeddings (text-embedding-3-small)
MCP_API_KEY=<random-secret>    # Bearer token for MCP server auth
JINA_API_KEY=...               # Optional — for higher Jina Reader rate limits (free tier: 20 RPM without key, 500 RPM with key)
```

### Neon Setup

```sql
-- Run once in Neon SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 12. File Map

### New Files
```
src/
├── lib/
│   ├── embedding.ts                    # Embedding utility functions
│   ├── contentFetcher.ts               # Fetch + extract page content (Jina + Readability)
│   └── rateLimit.ts                    # Simple rate limiter
├── app/
│   ├── api/
│   │   ├── search-insights/
│   │   │   └── route.ts                # Public semantic search API
│   │   ├── related-links/
│   │   │   └── route.ts                # Get related links API
│   │   └── [transport]/
│   │       └── route.ts                # MCP server endpoint
│   └── curated-links/
│       └── components/
│           └── SemanticSearch.tsx       # Search bar component
├── trigger/
│   ├── seed-discord-links.ts           # One-time seed: backfill all Discord links to DB
│   ├── embed-links.ts                  # Embedding background job
│   └── enrich-links.ts                 # Content enrichment + embedding
└── db/
    └── schema.ts                       # (modified) + allLinks + linkEmbeddings tables
```

### Modified Files
```
src/
├── db/
│   └── schema.ts                       # Add allLinks + linkEmbeddings tables
├── trigger/
│   └── discord-links.ts                # Update to write new links to allLinks table
├── app/
│   ├── curated-links/
│   │   ├── components/
│   │   │   └── CuratedLinksTabs.tsx    # Add search mode toggle
│   │   └── page.tsx                    # Minor: pass search state
│   └── api/
│       └── curated-links/
│           └── route.ts                # Trigger embedding on POST
└── package.json                        # New dependencies
```

---

## 13. Testing Strategy

### Local Development

1. **pgvector setup**: Enable extension in Neon dev database
2. **Embedding pipeline**: Run `npx trigger dev` and manually trigger embed job
3. **Search API**: Test `/api/search-insights?q=design+systems` in browser
4. **MCP server**: Use `mcp-remote` to connect locally, test each tool
5. **UI**: Verify search bar works in `/curated-links` page

### Test Cases

| Scenario | Expected |
|----------|----------|
| Search for exact title match | Returns link with ~0.95+ similarity |
| Search for related concept (no keyword overlap) | Returns semantically relevant links |
| Search with no results | Returns empty array, no error |
| Embed new link via admin API | Embedding job processes it within minutes |
| MCP tool call with valid auth | Returns JSON results |
| MCP tool call with invalid auth | Returns 401 |
| Rate limit exceeded | Returns 429 |

---

## 14. Migration & Rollout

### Step-by-step Deployment

1. **Enable pgvector** in Neon (SQL Editor)
2. **Deploy schema changes** (`drizzle-kit generate`, apply migration)
3. **Install new dependencies** and deploy
4. **Run embedding job** for existing links (may take 10-30 min depending on link count)
5. **Deploy search API** and test manually
6. **Deploy MCP server** and configure auth
7. **Add search UI** to `/curated-links` page
8. **Monitor** costs (embedding ~$0.02/1M tokens; ~800 links ≈ $0.002 total)

### Cost Estimate

| Item | Cost |
|------|------|
| Embedding 800 links (one-time) | ~$0.002 |
| Embedding 1 query | ~$0.000004 |
| 1000 queries/day | ~$0.004/day |
| pgvector on Neon | Free (included in plan) |
| MCP server on Vercel | Free tier sufficient |

**Total: effectively free for a personal site.**

---

## 15. Open Questions

1. ~~**Should we embed the Discord-sourced links AND the curated links, or only curated?**~~ — **Resolved.** The `all_links` table stores EVERY Discord link. Search works on all of them. Curation is just enrichment metadata.

2. **Content enrichment: fetch on-demand or batch?** Batch (Trigger.dev) is simpler. On-demand (fetch when embedding) is more flexible. Recommendation: batch via Trigger.dev, re-run periodically. Already reflected in the plan.

3. **Do you want the MCP server to be public or require auth?** Recommendation: require bearer token auth. The public search API is separate and doesn't need auth.

4. ~~**Should the search API also search non-curated Discord links?**~~ — **Resolved.** All Discord links are now in `all_links`. Search covers everything.

5. **Dimension reduction?** `text-embedding-3-small` supports dimension reduction via the `dimensions` parameter. 1536 is the default; you could go to 512 for faster search with minimal quality loss. Recommendation: use 1536 for best quality. Can optimize later if needed.

6. **How to handle duplicate URLs?** A link might appear in multiple Discord channels, or be shared multiple times. Should `all_links` deduplicate by URL, or allow duplicates (different messages, different context)? Recommendation: deduplicate by URL (use `url` as unique constraint). Keep the most recent version.

7. **Re-embedding when content changes?** If you add notes to a link later, the embedding should be regenerated. Should this happen automatically when notes are saved? Recommendation: yes — trigger re-embedding when `notes` or `isFavorited` changes in `all_links`.
