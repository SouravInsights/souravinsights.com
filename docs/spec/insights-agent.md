# Insights Agent — Spec

Turn the curated-links collection from a list of URLs into a knowledge base you can think with. Read the actual contents of every link, store them, make them searchable by meaning, and put an agent on top that answers questions using only that knowledge.

---

## The problems this solves (the actual pain)

**1. Writing is a scavenger hunt.** Every article I write starts the same way: blank page, 15 tabs of "things I remember reading," trying to reconstruct a framework from memory. The collection already contains the raw material for deep, well-referenced writing — essays on craft, agents, design, databases — but there's no way to surface "everything I've saved that's relevant to this paragraph." That's what the agent is for, for me and for anyone else writing in these domains.

**2. "Best tool for the job" is a judgment call the data can answer.** The Tools and Products channels hold hundreds of vetted options — sandboxes, compressors, agent infra, design utilities — with pricing and positioning on their pages. "I need a sandbox service for long-running agents, what's cheapest?" is answerable from the collection if we've actually read the pages. Keyword search on titles can't do it.

**3. You can't search for what you can't name.** "I've saved something about why rounded corners nest weirdly" — the article is literally called *Corners are relative*, and `corners` isn't in "nested rounded rectangles look wrong". Today's search matches substrings of titles and URLs, so forgotten = lost. Semantic search over the *contents* is the fix.

**Root cause of all three:** the collection stores *pointers* (URL + OG description), not *knowledge* (what the pages actually say). The fix is not a chatbot on the page — it's an extraction-and-retrieval pipeline with an agent on top.

---

## The core insight

Every link is a fragment — an idea that shifted a perspective, a tool that solved a problem. Individually small; together, an interconnected body of thinking. Right now that structure is invisible because we never read the pages. **The knowledge graph starts the moment we extract contents and embed them.** This spec is about building that layer once, simply, and letting every future feature (agent, MCP, HN, alerts) sit on it.

---

## Concepts I need before building (5-minute version)

- **Embedding** — a model turns text into a list of ~1536 numbers (a vector). Texts with similar meaning get similar vectors. This is "search by meaning" instead of search by substring. Cost: `text-embedding-3-small` at $0.02 per 1M tokens — the whole collection costs a few cents.
- **Chunk** — long articles get split into ~500-token pieces before embedding. Why: a 4,000-word essay averages out to a blurry vector; each chunk keeps one clear idea, and citations can point to the exact passage.
- **Vector search** — store all chunk vectors in Postgres (`pgvector`), then for a question: embed the question, ask for the nearest chunks mathematically. "Nearest" = most similar in meaning.
- **RAG (retrieval-augmented generation)** — instead of letting an LLM answer from its training (it has never seen my collection), we: retrieve the top-k relevant chunks → paste them into the prompt → the model answers *grounded* in them and cites real sources. Hallucination drops because the facts are in the prompt.
- **Tool / function calling** — you give the model a callable function (`search_knowledge("query")`). When it needs information, it emits a call; your code runs it and returns results; the model continues with them in view.
- **Agent** — just a loop: model → tool call → result → model… until it decides it can answer. Vercel AI SDK runs this loop for you (`generateText`/`streamText` with tools + `stopWhen`).

That's the whole vocabulary. Everything below is these six pieces arranged sanely.

---

## What the actual data looks like (checked, not assumed)

Read the live collection (~700 links, 7 channels):

| Channel | What's actually there | Extraction strategy |
| :--- | :--- | :--- |
| Articles | Long-form essays — brandur, seangoedecke, lucumr, PG, independent blogs | **Full article text.** The crown jewels for writing assistance. |
| Resources | Courses, books, learning paths, docs (learn-inference, Butterick's) | Landing page + syllabus/TOC. Know *what it teaches*, don't crawl the whole course. |
| Tools | Libraries, CLIs, small apps (many GitHub repos) | Homepage + README + features/pricing section → structured facts. |
| Products | SaaS pages (boat, Subframe, Conductor) | Homepage + /pricing → what it does, what it costs, who it's for. |
| Portfolios, Design, Newsletters | Mostly visual or one-pagers | Description-level only. Deep fetch = money for nothing. |

~350–450 of the 700 links deserve real extraction. The rest stay description-level. This split is also how the budget stays near zero.

Also found in the live data: several links are `Untitled` — weak metadata at intake, which extraction fixes for free (real `<title>` from the page).

---

## The hidden data-loss problem this fixes

`getMessagesFromChannel` fetches the **latest 100 messages per channel, no pagination**. Older links still exist in Discord but are unreachable by the site. Every new link buries the tail of the collection.

**The knowledge base's first job is a snapshot:** copy everything into Postgres, keyed by normalized URL. From then on, new arrivals are appended and nothing is ever lost. The agent becomes the permanent memory the Discord API can't be.

---

## Architecture — three pipelines, all boring

```
INTAKE (offline, runs on a schedule + one-off backfill)
  Discord channels ──► link registry (Postgres)
                        │ per link, category-aware:
                        │   fetch → extract text → clean
                        └──► chunk (~500 tok) ──► embed ──► link_chunks (pgvector)

ASK (runtime, per question)
  question ──► embed ──► vector search top-k chunks
           ──► agent loop: model + search_knowledge tool (calls it 1–2× per question)
           ──► answer grounded in chunks, real citations, streamed

LATER (same KB, new surfaces — no rebuilds)
  MCP server • write-assist mode • watch/alerts • HN as second source
```

Reliability rules, applied everywhere:

1. **Idempotent ingest.** Every URL stores a content hash; re-runs process only new/changed pages. Crash anywhere → rerun the script, nothing doubles.
2. **Extraction fallback ladder, never fatal.** Static fetch → Readability → headless render (puppeteer/chromium already installed for link previews) → give up cleanly, mark `failed`, keep description-level data. One bad page can't block 700.
3. **The model can only cite what it received.** The UI renders only links returned by tool calls, so invented URLs are structurally impossible, not just prompt-discouraged.
4. **Honest degradation.** No good chunks → "the collection doesn't cover this" + nearest category. Vector DB down → plain message, page itself unaffected (agent is additive, never in the page's rendering path).

---

## Stack (total cost ≈ a coffee)

| Piece | Choice | Cost | Why |
| :--- | :--- | :--- | :--- |
| LLM + embeddings | OpenAI via Vercel AI SDK (`ai`, `@ai-sdk/openai`) — `gpt-4o-mini` + `text-embedding-3-small` | Embeddings: **~$0.05 one-time** (~450 pages × ~3K tokens). Chat: ~3.5K tokens/query ≈ **$0.001/query** | One SDK for embed + agent loop + streaming; model config isolated in one file to swap providers later. |
| Vector + text store | **Neon Postgres + pgvector** (existing DB) | $0 — free tier (0.5GB); 5K chunks ≈ 35MB | One service, plain SQL, Drizzle already in the repo. Changed from my earlier Upstash Vector pick: chunks are relational (chunk → link → channel), and one dependency beats two free ones. pgvector is also the standard thing worth learning. |
| Extraction | `fetch` + `@mozilla/readability` + `node-html-parser`; fallback to existing puppeteer/chromium for JS-heavy pages | $0 | No scraping SaaS. We already run headless Chromium for screenshots — reuse the pattern. |
| Scheduling | Trigger.dev (existing task detects new Discord links) | $0 free tier | New-link detection already exists; add "then ingest it." |
| Auth-ish for public APIs | Upstash Redis ratelimits + visitor cookie pattern (already used by likes) | $0 | Public agent without accounts. |

**Budget reality:** $5 OpenAI credit to start. Rebuild the entire KB any time for ~5 cents. Chat at 1,000 queries/month ≈ $1. Everything else is on free tiers already in use.

---

## Data model

Two new tables. `links` keys everything by normalized URL (same `normalizeUrl` as the UI, so dedupe matches what the page shows).

```sql
create extension if not exists vector;

create table links (
  id            serial primary key,
  url_key       text unique not null,   -- normalizeUrl(url)
  url           text not null,
  title         text,                    -- real <title> from extraction, fixes "Untitled"
  channel       text not null,           -- reading-list | tools | ...
  discord_id    text,                    -- snowflake → added-date
  status        text not null default 'pending',  -- pending | ok | thin | failed
  content_hash  text,                    -- skip unchanged pages on re-runs
  raw_text      text,                    -- cleaned full text (small: ~KBs)
  created_at    timestamp default now()
);

create table link_chunks (
  id          serial primary key,
  link_id     integer references links(id),
  chunk_index integer not null,
  content     text not null,
  embedding   vector(1536)              -- hnsw index, cosine distance
);
```

Embedding text per chunk = chunk content. Retrieval joins back through `links` for title/URL/channel, and boosts by like counts read live from Redis (never embedded — they change daily).

**Chunking params (don't overthink):** ~500 tokens, ~15% overlap, split on paragraph boundaries. Citation unit = chunk → URL.

---

## The agent experiences (on top of the KB)

### 1. Ask — the public agent (solves problems 2 & 3)

Chat panel on the page. One tool: `search_knowledge(query, channel?)`. The loop: retrieve → maybe search again with a refined query → answer in a few sentences with real citations rendered as link cards (favicon, domain, likes).

Because retrieval is over **contents**, this does what the page never could:
- "something to test color contrast" → finds tools whose *pages* mention it
- "what have I saved about shipping vs building" → finds the seangoedecke essay
- "animated halftone shader effect" → finds the Maxime Heckel piece even if you forgot every proper noun in it

### 2. Writing Desk — the flagship (problem 1), mine first, public too

Same agent, different contract. Input: a thesis or draft paragraph. Output: the 6–10 most relevant fragments from the KB *with citations and a one-line "why this is relevant" each* — the 15-tabs moment, compressed into one query. Optional second step: propose an outline that weaves the fragments in.

I use it from my editor via curl/MCP later; anyone writing about design/engineering uses it on the site. The collection becomes a reusable context layer for thinking, not a museum of links.

### 3. Compare & decide (problem 2, deeper)

"Compare sandbox services in the collection." Agent retrieves candidates, then can **fetch a page fresh** (`fetch_link` tool, 24h Redis cache, max 3 per question) when stored chunks aren't enough — e.g. a pricing detail. Returns a small table + a recommendation with tradeoffs. Choosing tools is a weekly pain; this is where the agent earns trust.

### Later (unlocked by the KB, not blocking it)

- **MCP server** exposing `search_knowledge` → my collection inside Claude/Cursor mid-work. Also the portfolio artifact.
- **Watch**: intent subscriptions ("ping me when X lands") + a weekly agent-written Pulse on the page. Cheap once chunks exist.
- **Tend**: intent tags (`free`, `open-source`, `motion`) extracted during ingest; dead-link repair; "saved this 4 months ago" at intake.
- **HN as second source**: one `LinkSource` interface; HN slots behind the same search tool. `hnUtils.ts` already talks to the Algolia API.

---

## How retrieval quality is proven (not vibes)

1. **Golden eval set** — commit ~30 test queries → expected URLs to the repo, written against the *live* collection ("fuzzy recall" cases especially: describe content, not title).
2. Script runs retrieval only (no LLM) → report **hit-rate@5**. Ship the agent only when ≥ 80%.
3. Re-run after any ingest change (chunk size, extractor tweaks, tags). Watch the number move — that's the feedback loop that teaches RAG intuition.
4. **Extraction QA loop**: before bulk ingest, run 50 diverse links, *read the extracts by eye*, fix the extractor, repeat. Weak extractor = weak KB, so this loop is the real product work.
5. Runtime honesty: agent answers must only contain tool-returned URLs; PostHog event on every query + existing UTM params measure whether answers get clicked.

---

## Files

```
src/lib/kb/
  extract.ts     // fetch + readability + chromium fallback, category-aware depth
  chunk.ts       // ~500 tok, overlap, paragraph-aware
  embed.ts       // embedMany() wrapper
  search.ts      // vector search + like-boost join
  model.ts       // the one file that knows which models we use
  prompt.ts      // system prompt + citation rules

scripts/kb-backfill.ts    // snapshot Discord → links, extract, chunk, embed (idempotent)
scripts/kb-eval.ts        // golden set → hit-rate@5
eval/kb-golden.json       // the test queries

src/app/api/insights/chat/route.ts    // agent loop, streamed
src/app/api/insights/search/route.ts  // raw retrieval, public JSON
src/app/curated-links/components/AskPanel.tsx
src/trigger/kb-sync.ts    // new links → ingest (extends existing Discord task)
drizzle/                  // migration: links + link_chunks (pgvector)
```

---

## Build order

0. **Snapshot.** `links` table + backfill script, Discord → Postgres. Verify counts match the page. *Day 1 and the collection already stops losing history.*
1. **Extraction loop.** 50 links → eyeball → fix → repeat, then bulk (~450 deep, rest thin). Cost: cents.
2. **Chunk + embed + search.** `search` API works from curl. Nothing LLM yet.
3. **Golden eval.** ≥80% hit-rate@5 or iterate on chunks/extract until it is.
4. **Ask agent.** Chat route + AskPanel, citations, rate limits, PostHog events.
5. **Writing Desk mode** on top of Ask. Use it for one real article; fix what annoys me.
6. **Compare/fetch tool.** Then MCP. Then Watch/Tend as their own small specs.

Each step is independently shippable and verifiable. No step requires heroic faith.

---

## Risks, named

- **JS-heavy / bot-walled pages** (some articles, Twitter links): chromium fallback; failures stay description-level and marked. Accept partial coverage — 85% of a curated collection still beats 100% of nothing.
- **Paywalled/long-chapter resources**: extract syllabus, not content; honest `thin` status.
- **Stale content**: pages change; `content_hash` + weekly re-check of the ~50 most-liked links keeps the KB fresh without a full re-crawl.
- **Scope creep into a graph database**: don't. Chunks + tags cover the use cases; entity/linkage graphs are a phase-2 garnish *if* the eval set ever demands them.

## Out of scope

- Accounts, chat history, saved sessions.
- Crawling beyond the 7 channels' linked pages (no second-hop links). The graph grows by curation, not by spidering.
- Agent writes anywhere except its own tables. Discord stays the intake; humans delete; the agent only adds.
