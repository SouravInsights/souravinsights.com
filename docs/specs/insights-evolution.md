# Insights Page — Evolution Brainstorm

> **Status**: Research / Half-baked ideas — not implemented  
> **Last updated**: 2026-07-24  
> **Context**: [`/src/app/curated-links/`](../../src/app/curated-links/)

---

## 1. What Exists Today

The `/curated-links` page (nicknamed "My Digital Garden" / "Insights") pulls links from a private Discord server across 8 channels:

| Discord Channel   | Category               |
|------------------|------------------------|
| `reading-list`   | Articles & essays      |
| `resources`      | Misc resources         |
| `product-hunt`   | Products               |
| `newsletters`    | Newsletters            |
| `fav-portfolios` | Design portfolios      |
| `tools`          | Dev & design tools     |
| `opportunities`  | Jobs & opportunities   |
| `design-inspo`   | Visual inspiration     |

**What data we have per link:**
- `url`, `title`, `description` (pulled from Discord embed metadata)
- `notes` (admin-written curator notes)
- `creatorTwitter`
- `clickCount`
- `category`
- `createdAt` / `updatedAt`

**Current capabilities:**
- Tab-based browsing per channel
- Basic keyword search (title + URL match — `String.includes`)
- Customisable card themes (9 visual styles)
- Admin mode: curate, add notes, generate newsletter drafts
- Favorites system
- Newsletter integration (Buttondown)

**The gap**: It's a _beautiful_ list. But it's dumb. It can't reason, connect ideas, or respond to intent. It doesn't know that a link about "design systems" is related to one about "component-driven development" unless both happen to share the exact word.

---

## 2. The Core Insight (pun intended)

> The collection is valuable *not just as a list*, but as a **latent knowledge graph** — a crystallisation of years of intellectual taste, accumulated references, and mental models.

The links aren't random. They represent:
- What caught your attention enough to share
- What you thought was worth broadcasting to a community
- A trail of your evolving interests, design sensibilities, and technical curiosity

That signal is gold. Right now, it's untapped.

---

## 3. The Problem We're Actually Solving

There are two distinct but related problems:

### 3a. The "Blank Page" Problem (for yourself)
When writing an article or exploring a half-formed idea, you're starting from scratch — but you actually have a **rich corpus of related references you've already vetted**. The friction is that:
- They're scattered across 8 tabs
- You have to remember they exist
- Keyword search won't surface them if the vocabulary doesn't overlap exactly

### 3b. The "Just a Links Page" Problem (for visitors)
Visitors can browse and click. But they can't:
- Query the collection by *what they're trying to understand*
- Discover non-obvious connections between links across categories
- Get personalised entry points based on their interest
- Find links that are *adjacent* to something they already know

---

## 4. The Vision: A Semantic Knowledge Layer

Transform the `curated-links` collection from a list into a **queryable semantic knowledge base** — searchable by meaning, not just keywords.

### What "semantic search" actually means here

Instead of `link.title.includes("design system")`, you'd:
1. Take each link and embed its content into a vector (a fixed-length list of numbers that captures *meaning*)
2. When someone types a query like *"how do teams collaborate on visual language"*, embed that query the same way
3. Find all links whose vectors are mathematically close to the query vector

This means a link titled "Building with tokens: how Figma thinks about design decisions" would surface for "design system collaboration" even without a word overlap.

### What content would be embedded per link

- Title
- Meta description (from Discord embed)
- Curator notes (your personal context — arguably the most signal-rich field)
- Category/channel
- Optionally: actual full article content (scraped at index time)

---

## 5. Ideas Bucket — Dumping Everything

### 5a. Semantic Search on the Insights Page

The most obvious unlock: replace (or augment) the current `String.includes` search with vector search.

**User experience:**
- Search box that accepts natural language queries
- Results ranked by semantic relevance, not just tab
- Cross-tab results: a query like "indie hacker journey" could surface links from `reading-list`, `newsletters`, `product-hunt` simultaneously
- Show *why* a link is relevant (e.g., highlight the matching conceptual cluster)
- Optional: show a "confidence" or "relevance score"

**Technical path:**
- Embed all links using an embedding model (OpenAI `text-embedding-3-small`, Cohere, or a local model via Ollama)
- Store vectors in a vector DB (Postgres + `pgvector`, Pinecone, Qdrant, Supabase — you already have Postgres via Drizzle!)
- On search, embed the query and run an ANN (approximate nearest neighbour) query

**Big win**: Because you're already on Postgres/Drizzle, `pgvector` is a zero-infrastructure-change option. Add the extension, add a vector column to `curated_links`, backfill, done.

---

### 5b. The Writing Companion — "Pull Related References" Feature

When you're writing a new blog post, you want to pull relevant links from your collection to:
- Get the juices flowing
- Find quotes, ideas, adjacent arguments you'd forgotten you'd saved
- Not start from nothing

**Idea: A "writing mode" or "brainstorm mode" on the insights page**

You paste a working title, a few sentences of your idea, or even just a loose thought like:  
*"I want to write about how developers and designers stop communicating well at scale"*

The system:
1. Embeds your input
2. Queries the collection for semantically similar links
3. Returns a curated "starter pack" of references grouped by angle (tools, articles, real examples, counterarguments)
4. Optionally generates a quick "inspiration brief" — 3-5 bullet points on angles you could explore, backed by the links it found

This is *just for you* as a private feature behind your admin mode — or you could open it up so any visitor can do this with your collection.

---

### 5c. MCP Server — "Insights as a Tool"

This is the most expansive idea and probably the most exciting long-term.

**What is MCP here?**  
Model Context Protocol. A standard that lets AI agents/assistants call external tools. If you expose your insights collection as an MCP server, any AI tool (Claude, Cursor, your own terminal agent, etc.) can query your collection mid-task.

**Concrete scenario:**  
You're in Cursor writing a blog post. Your AI agent has access to an MCP tool called `search_sourav_insights`. You type:  
*"Before I write the intro, pull references from my collection about impostor syndrome in senior engineers"*

The agent calls `search_sourav_insights({ query: "impostor syndrome senior engineers", limit: 5 })` and gets back:
```json
[
  {
    "title": "The Senior Engineer Paradox",
    "url": "...",
    "notes": "Great piece on why expertise breeds doubt",
    "category": "reading-list"
  }
]
```

The agent can then weave those into your draft, suggest angles, or just show them for your reference.

**What the MCP server would need:**
- A `/api/mcp/search` endpoint (or a proper MCP-spec compliant server)
- Auth (API key or similar — you don't want your full collection publicly queryable without limits)
- The semantic search layer from 5a

**MCP tools to expose:**
- `search_insights(query, limit, category_filter?)` — semantic search
- `get_recent_links(category?, n?)` — get N most recent links
- `get_link_by_topic(topic)` — returns clustered links around a theme
- `get_collection_stats()` — how many links, which categories, date range

**Where to host:**  
An MCP server can be a simple Next.js API route, a standalone Vercel serverless function, or even a lightweight `mcp` package. Since this is already a Next.js project, a route handler is the path of least resistance.

---

### 5d. "Related Links" on Blog Posts

Your blog posts (under `/blog`) and your insights collection live in the same codebase. Right now, they don't talk to each other.

**Idea:** At the bottom of each blog post, automatically surface 3-5 links from your insights collection that are semantically similar to the post's content.

- Embed the blog post content (or just title + tags)
- At build/render time, query the vector store for the closest matching links
- Render them as a "Further Reading from My Collection" section

This makes your blog posts richer and drives more traffic/engagement to your insights page.

---

### 5e. Auto-Clustering / Topic Graph

Once you have vectors for all ~800+ links, you can run clustering algorithms (k-means, HDBSCAN, UMAP) to discover emergent topics in your collection — ones you didn't explicitly curate.

**What this could look like:**
- A "Topics" view on the insights page: `design-systems (23)`, `indie-hacking (17)`, `mental-models (11)`, etc.
- These would be auto-generated from the collection's latent structure — not hand-labeled
- Clicking a topic shows all links in that cluster regardless of which Discord channel they came from

This is cool because it would reveal your actual intellectual fingerprint — the themes that recur across all 8 channels — rather than the artificial siloing of Discord channels.

---

### 5f. Temporal Intelligence — "What Was I Thinking About?"

Links have `createdAt` timestamps. Combined with vector search, you could do time-sliced queries:

- "Show me everything I was saving in early 2024" → reveals what obsessed you then
- A "time machine" slider that lets you browse by era
- "Trending topics" in your collection over time (what are you saving more of lately vs. a year ago?)

This turns the collection into a kind of intellectual autobiography.

---

### 5g. Public "Ask My Collection" Interface

A step further from 5b: make the search *conversational and public*.

Instead of a search box, imagine a chat interface on the insights page:

> *"What do you have on building products with small teams?"*  
> → Returns 4 links with a 2-sentence synthesis of what they collectively say

> *"Any resources on typography for developers who aren't designers?"*  
> → Returns links + a note: "I also wrote about this in [your blog post]"

This is a RAG (Retrieval Augmented Generation) system:
- User query → embed → retrieve relevant links → pass to LLM → LLM synthesises an answer grounded in the retrieved links
- The LLM would cite which links it drew from
- Important: the LLM doesn't make things up — it only talks about what's in your collection

This transforms the insights page from "browse my links" to "talk to my brain" — which is genuinely unusual and valuable.

---

### 5h. Discord Bot Integration — Auto-Ingest with Metadata Enrichment

Right now, the data flow is:
1. You share a link in Discord
2. The page fetches Discord messages live (with a 60s revalidation)

This is fine for browsing, but it means:
- No vector indexing (can't embed on every page load)
- No persistence beyond what Discord stores
- No enrichment pipeline (scraping full article content, extracting tags, etc.)

**A better architecture for semantic search:**

```
Discord message posted
        ↓
Discord bot / webhook captures it
        ↓
Background job (Trigger.dev — already set up!) kicks off:
  - Fetch link metadata (Open Graph, head scrape)
  - Optionally: scrape article full-text (Readability, Firecrawl, Jina Reader)
  - Generate embedding via embedding API
        ↓
Store to Postgres: (title, url, description, full_text_excerpt, embedding, category, created_at)
        ↓
Link now searchable semantically
```

You already have Trigger.dev wired in (`/src/trigger/`). This is just adding a new background job.

---

## 6. Technology Options

### Vector Storage

| Option | Pros | Cons |
|--------|------|------|
| **pgvector** (Postgres extension) | Already on Postgres, zero new infra, Drizzle-compatible | Need to enable the extension on your DB provider (Neon/Supabase both support it) |
| **Supabase** (has pgvector) | Managed, has built-in vector search, good DX | Switching DB if not already there |
| **Pinecone** | Purpose-built, great perf, managed | Cost, new service to manage |
| **Qdrant** | Open-source, very good | Self-hosting complexity |
| **Vercel AI SDK + built-in** | Very easy if already using Vercel AI SDK | Less control |

**Recommendation for this codebase:** `pgvector` — you're already on Drizzle+Postgres. Just add the extension and a vector column.

### Embedding Models

| Model | Cost | Quality | Speed |
|-------|------|---------|-------|
| OpenAI `text-embedding-3-small` | ~$0.02/1M tokens | Very good | Fast |
| OpenAI `text-embedding-3-large` | ~$0.13/1M tokens | Excellent | Fast |
| Cohere `embed-v4` | Competitive | Very good | Fast |
| `nomic-embed-text` (Ollama/local) | Free | Good | Depends on hardware |
| Google `text-embedding-004` | Free tier generous | Very good | Fast |

**For a collection of ~800-1000 links at ~200 tokens each = ~200K tokens total**  
`text-embedding-3-small` would cost roughly **$0.004** to embed everything. Basically free.

### Search / RAG Layer

| Option | Description |
|--------|-------------|
| **Raw SQL** via pgvector `<->` operator | `ORDER BY embedding <-> query_vector LIMIT 10` — simple and direct |
| **Vercel AI SDK** | Has built-in embedding + vector store abstractions |
| **LangChain / LlamaIndex** | Full RAG frameworks, more powerful but heavier |
| **Custom Next.js API route** | Just fetch + embed + SQL — full control, minimal abstraction |

### MCP

| Option | Description |
|--------|-------------|
| **`@modelcontextprotocol/sdk`** | Official TypeScript SDK — ~50 lines for a server |
| **Vercel AI SDK MCP support** | First-class support for exposing tools |
| **Cloudflare Workers** | Edge-deployed MCP server, very low latency |
| **Next.js route handler** | Simplest — use your existing infra |

---

## 7. Current Data Gaps

To make any of this work well, we need richer link data than what Discord embeds give us today:

| Field | Current State | Needed |
|-------|--------------|--------|
| Title | ✅ From Discord embed | Good as-is |
| Description | ✅ Short meta description | Useful but thin |
| Full article text | ❌ Missing | Very high value for embeddings |
| Tags / keywords | ❌ Missing | Useful for faceted search |
| Publication date | ❌ Missing | Useful for temporal features |
| Author | Partial (creatorTwitter) | Would be nice |
| Reading time | ❌ Missing | Nice UX signal |
| Language | ❌ Missing | Useful for filtering |

**To fill the gaps:**
- **Firecrawl** / **Jina Reader** (`r.jina.ai/<url>`) — clean article text extraction
- **Open Graph + meta scraping** — more reliable title/description than Discord sometimes gives
- **Diffbot / Clearbit** — richer structured extraction (paid)
- DIY scraping via `cheerio` or `playwright` in a Trigger.dev job

---

## 8. UX Ideas for the Enhanced Insights Page

- **Dual search modes**: Toggle between "keyword" (current) and "semantic" (new)  
- **Search bar placeholder that cycles through example queries**: *"how do I build in public?"*, *"design tips for developers"*, *"startup growth tactics"*  
- **"Surprise me" button**: Random walk through the collection, weighted by recency or engagement  
- **Concept tags auto-generated per link** (from embedding cluster centroids): Shown as small chips on each card  
- **"Writing Mode" entry point**: A dedicated UI state that takes a topic input and returns a structured inspiration brief  
- **Graph view**: A D3/vis.js force-directed graph where nodes are links and edges are semantic similarity — click to explore neighbourhoods  
- **"Time machine" mode**: Scrub a date slider and see the collection as it looked at a given point in time  

---

## 9. The MCP Angle — Deeper Thinking

The MCP idea is interesting because it changes *who the user is*.

Right now: visitors browse your collection  
With MCP: AI agents (including your own) can query your collection as a tool

This is a shift from "content to consume" to "knowledge as infrastructure". Your curated collection becomes a **first-party data source** that enriches any AI-assisted workflow you (or others) do.

**Potential MCP tool schema:**

```typescript
// Tool: search_insights
{
  name: "search_insights",
  description: "Search Sourav's curated link collection semantically. Returns relevant articles, tools, and resources matching the query.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query describing what you're looking for"
      },
      limit: {
        type: "number",
        description: "Max results to return (default: 5, max: 20)"
      },
      category: {
        type: "string",
        enum: ["reading-list", "tools", "resources", "newsletters", "design-inspo", "fav-portfolios", "product-hunt", "opportunities"],
        description: "Optional: restrict search to one category"
      }
    },
    required: ["query"]
  }
}
```

---

## 10. Open Questions / Things to Research

- [ ] Does your current Postgres provider (Neon? Supabase?) support `pgvector`?  
- [ ] What's the current total link count across all Discord channels?  
- [ ] Do the Trigger.dev jobs already set up do anything with ingestion, or are they for other things?  
- [ ] Is there a rate limit on the Discord API for the message fetching that would block a full backfill?  
- [ ] Should the semantic search be public (all visitors) or gated (admin / API key)?  
- [ ] For the MCP server — is this something you'd host separately or within the Next.js app?  
- [ ] What's your preferred embedding provider? (OpenAI is the obvious default)  
- [ ] Would you want the "ask my collection" chat feature to be *generative* (LLM synthesises answers) or just retrieval (here are the relevant links)?  
- [ ] Should `curated_links` in the DB become the *canonical* store (instead of Discord being the primary), with Discord as the input queue?  

---

## 11. Suggested Phased Approach (when you're ready to build)

### Phase 0 — Foundation
- Add `pgvector` extension to Postgres
- Add `embedding` column (vector, 1536 dims for OpenAI small) to `curated_links`
- Write a one-off script to embed all existing curated links and backfill

### Phase 1 — Semantic Search on the UI
- New `/api/search` route: takes query string, embeds it, runs vector search, returns results
- Replace/augment `filterLinks()` in `CuratedLinksTabs.tsx` with the semantic search endpoint
- Cross-tab results view

### Phase 2 — Richer Ingestion Pipeline
- Trigger.dev job: on new Discord link → scrape full text → embed → store
- Optionally: backfill full-text for existing links

### Phase 3 — Writing Companion / Inspiration Mode
- Admin-only "brainstorm mode" UI
- Paste topic → get structured inspiration brief backed by collection

### Phase 4 — MCP Server
- `@modelcontextprotocol/sdk` server exposing `search_insights` tool
- API key auth
- Deploy as standalone Next.js route or edge function

### Phase 5 — Public "Ask My Collection"
- Conversational RAG interface on the insights page
- LLM (Claude / GPT-4o-mini) synthesises answers grounded in retrieved links

---

## 12. Related Reading to Explore

- [pgvector docs](https://github.com/pgvector/pgvector) — Postgres vector extension
- [Vercel AI SDK — Embeddings](https://sdk.vercel.ai/docs/ai-sdk-core/embeddings) — likely the easiest integration path
- [Model Context Protocol spec](https://modelcontextprotocol.io) — for the MCP server
- [Jina Reader](https://jina.ai/reader/) — `r.jina.ai/<url>` returns clean markdown of any page, free
- [Firecrawl](https://firecrawl.dev) — richer scraping with structured extraction
- Simon Willison's posts on personal knowledge bases — he's done a lot of thinking here
- [Anthropic's Contextual Retrieval post](https://www.anthropic.com/news/contextual-retrieval) — great framing for enriching chunks before embedding

---

*This document is intentionally messy and exploratory. The goal is to have everything in one place before deciding what to actually build.*
