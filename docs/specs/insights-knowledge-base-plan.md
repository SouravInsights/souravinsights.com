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
// curatedLinks table
{
  id: serial (PK)
  title: text
  url: text
  description: text
  category: varchar(100)    // discord channel name
  notes: text               // admin annotations
  creatorTwitter: varchar(100)
  clickCount: integer
  newsletterStatus: varchar(20)
  buttondownEmailId: varchar(100)
  createdAt: timestamp
  updatedAt: timestamp
}
```

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
└─────────────────┘     └──────────────────┘     │  curated_links│
                                                  │  link_embeddings│
                    ┌──────────────────┐          │  (pgvector)  │
                    │  Content Fetcher │─────────▶│              │
                    │  (Trigger.dev)   │          └──────┬───────┘
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

## 4. Phase 1 — pgvector & Embeddings Infrastructure

### 4.1 Enable pgvector Extension

Run in Neon SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 Add Embedding Column to Schema

**File: `src/db/schema.ts`**

```typescript
import { vector, index } from "drizzle-orm/pg-core";

export const curatedLinks = pgTable("curated_links", {
  // ... existing columns ...
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => [
  index("embedding_cosine_idx").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops")
  ),
]);
```

This adds a 1536-dimensional vector column (matching `text-embedding-3-small`) and a HNSW index for fast cosine similarity search.

### 4.3 Create Embedding-Only Table (Alternative Approach)

If we don't want to modify the existing `curated_links` table, we can create a separate table:

```typescript
// src/db/schema.ts
export const linkEmbeddings = pgTable("link_embeddings", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").references(() => curatedLinks.id),
  url: text("url").notNull(),
  content: text("content"),  // enriched content summary
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddedAt: timestamp("embedded_at").defaultNow(),
}, (table) => [
  index("embedding_cosine_idx").using(
    "hnsw",
    table.embedding.op("vector_cosine_ops")
  ),
  index("link_id_idx").on(table.linkId),
]);
```

**Recommendation:** Use the separate table approach. It keeps the existing schema clean, allows re-embedding without touching core data, and supports multiple embedding strategies if needed later.

### 4.4 Generate Migration

```bash
npx drizzle-kit generate
```

Apply manually in Neon SQL Editor (Drizzle's HTTP driver doesn't support DDL directly).

### 4.5 Install Dependencies

```bash
npm install @ai-sdk/openai ai @modelcontextprotocol/sdk@1.26.0 mcp-handler zod@3
```

### 4.6 Environment Variables

```env
OPENAI_API_KEY=sk-...           # For embeddings
MCP_API_KEY=...                 # Bearer token for MCP auth (generate a random secret)
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
import { curatedLinks, linkEmbeddings } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { generateEmbedding, buildEmbeddingInput } from "@/lib/embedding";

export const embedLinks = schedules.task({
  id: "embed-links",
  // Run daily or on-demand
  run: async (payload) => {
    logger.info("Starting embedding job");

    // Find all curated links without embeddings
    const links = await db
      .select({
        id: curatedLinks.id,
        title: curatedLinks.title,
        url: curatedLinks.url,
        description: curatedLinks.description,
        notes: curatedLinks.notes,
      })
      .from(curatedLinks)
      .leftJoin(
        linkEmbeddings,
        eq(curatedLinks.id, linkEmbeddings.linkId)
      )
      .where(isNull(linkEmbeddings.id));

    logger.info(`Found ${links.length} links to embed`);

    let embeddedCount = 0;
    for (const link of links) {
      try {
        const inputText = buildEmbeddingInput(link);
        const embedding = await generateEmbedding(inputText);

        await db.insert(linkEmbeddings).values({
          linkId: link.id,
          url: link.url,
          content: inputText,
          embedding,
        });

        embeddedCount++;
      } catch (error) {
        logger.error(`Failed to embed link ${link.id}: ${link.title}`, { error });
      }
    }

    logger.info(`Embedded ${embeddedCount}/${links.length} links`);
    return { success: true, embeddedCount };
  },
});
```

### 5.3 Embed Existing Links

After deploying, trigger the job manually:
```bash
npx trigger dev --run embed-links
```

Or call the Trigger.dev API to trigger it once. This will process all existing `curated_links` rows and generate embeddings for them.

### 5.4 Re-embed on Link Add

When a new link is added via the admin API (`POST /api/curated-links`), trigger embedding asynchronously:

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
import { curatedLinks, linkEmbeddings } from "@/db/schema";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
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

    // Compute cosine similarity and rank
    const similarity = sql<number>`
      1 - (${cosineDistance(linkEmbeddings.embedding, queryEmbedding)})
    `;

    const results = await db
      .select({
        id: curatedLinks.id,
        title: curatedLinks.title,
        url: curatedLinks.url,
        description: curatedLinks.description,
        category: curatedLinks.category,
        notes: curatedLinks.notes,
        similarity,
      })
      .from(linkEmbeddings)
      .innerJoin(curatedLinks, eq(linkEmbeddings.linkId, curatedLinks.id))
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

### 7.1 Content Fetcher Utility

**File: `src/lib/contentFetcher.ts`**

```typescript
// Fetch page content and extract readable text
// Uses a simple approach: fetch HTML, extract text from <p>, <h1>-<h6>, <li>, <blockquote>

export async function fetchPageContent(
  url: string,
  maxChars = 3000
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SouravInsights/1.0 (link-curator)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Simple text extraction (no heavy dependencies)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text.slice(0, maxChars);
  } catch (error) {
    console.error(`Failed to fetch content for ${url}:`, error);
    return null;
  }
}
```

### 7.2 Enrichment Trigger.dev Job

**File: `src/trigger/enrich-links.ts`**

```typescript
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@/db";
import { curatedLinks, linkEmbeddings } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";
import { fetchPageContent } from "@/lib/contentFetcher";
import { generateEmbedding, buildEmbeddingInput } from "@/lib/embedding";

export const enrichAndEmbed = schedules.task({
  id: "enrich-and-embed",
  run: async (payload) => {
    logger.info("Starting enrichment + embedding job");

    // Find links without embeddings
    const links = await db
      .select({
        id: curatedLinks.id,
        title: curatedLinks.title,
        url: curatedLinks.url,
        description: curatedLinks.description,
        notes: curatedLinks.notes,
      })
      .from(curatedLinks)
      .leftJoin(linkEmbeddings, eq(curatedLinks.id, linkEmbeddings.linkId))
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

### 7.3 Fallback Strategy

Some URLs will be inaccessible (403, paywalled, slow, etc.). The system gracefully falls back:

1. **Try** to fetch page content
2. **If successful**: embed title + description + notes + content
3. **If failed**: embed title + description + notes only

This means every link gets embedded regardless of content fetch success.

---

## 8. Phase 5 — MCP Server (Remote HTTP)

### 8.1 MCP Route Handler

**File: `src/app/api/[transport]/route.ts`**

This follows the `mcp-handler` package pattern for Vercel-deployed Next.js.

```typescript
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { db } from "@/db";
import { curatedLinks, linkEmbeddings } from "@/db/schema";
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
      id: curatedLinks.id,
      title: curatedLinks.title,
      url: curatedLinks.url,
      description: curatedLinks.description,
      category: curatedLinks.category,
      notes: curatedLinks.notes,
      similarity,
    })
    .from(linkEmbeddings)
    .innerJoin(curatedLinks, eq(linkEmbeddings.linkId, curatedLinks.id))
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
  // Get the embedding for the given link
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
      id: curatedLinks.id,
      title: curatedLinks.title,
      url: curatedLinks.url,
      description: curatedLinks.description,
      category: curatedLinks.category,
      notes: curatedLinks.notes,
      similarity,
    })
    .from(linkEmbeddings)
    .innerJoin(curatedLinks, eq(linkEmbeddings.linkId, curatedLinks.id))
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
    .from(curatedLinks)
    .where(eq(curatedLinks.category, category))
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
    .from(curatedLinks)
    .where(eq(curatedLinks.id, linkId))
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
npm install @ai-sdk/openai ai mcp-handler zod@3 @modelcontextprotocol/sdk@1.26.0
```

| Package | Purpose |
|---------|---------|
| `@ai-sdk/openai` | OpenAI provider for Vercel AI SDK |
| `ai` | Vercel AI SDK core (`embed`, `embedMany`) |
| `mcp-handler` | Vercel's MCP adapter for Next.js |
| `@modelcontextprotocol/sdk` | MCP protocol SDK |
| `zod` | Schema validation for MCP tools |

### Environment Variables

```env
# Existing (no change)
DATABASE_URL=postgresql://...
ADMIN_API_KEY=...

# New
OPENAI_API_KEY=sk-...          # For embeddings (text-embedding-3-small)
MCP_API_KEY=<random-secret>    # Bearer token for MCP server auth
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
│   ├── contentFetcher.ts               # Fetch + extract page content
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
│   ├── embed-links.ts                  # Embedding background job
│   └── enrich-links.ts                 # Content enrichment + embedding
└── db/
    └── schema.ts                       # (modified) + linkEmbeddings table
```

### Modified Files
```
src/
├── db/
│   └── schema.ts                       # Add linkEmbeddings table
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

1. **Should we embed the Discord-sourced links AND the curated links, or only curated?** Discord links are ephemeral (fetched live, not stored). We'd need to store them in the DB first to embed them. Recommendation: embed only `curated_links` initially; if you want Discord links too, add a step to persist them.

2. **Content enrichment: fetch on-demand or batch?** Batch (Trigger.dev) is simpler. On-demand (fetch when embedding) is more flexible. Recommendation: batch via Trigger.dev, re-run periodically.

3. **Do you want the MCP server to be public or require auth?** Recommendation: require bearer token auth. The public search API is separate and doesn't need auth.

4. **Should the search API also search non-curated Discord links?** Currently Discord links aren't in the DB. If you want to include them, we'd need to store them first. Recommendation: start with curated links, expand later.

5. **Dimension reduction?** `text-embedding-3-small` supports dimension reduction via the `dimensions` parameter. 1536 is the default; you could go to 512 for faster search with minimal quality loss. Recommendation: use 1536 for best quality.
