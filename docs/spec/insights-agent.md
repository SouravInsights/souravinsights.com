# Insights Agent — Spec

An AI agent for `/curated-links` that answers questions with links from the collection. Not a chatbot bolted onto the page — an answer engine whose only source of truth is the ~700 links already vetted by a human.

The pitch to a visitor: "Stop scrolling 700 rows. Describe what you need, get the 3 links from this collection that fit, with reasons."

---

## Why this collection deserves an agent

The links are pre-filtered by taste. A web search for "tool to test color contrast" returns 50 SEO-spam listicles; this collection returns the one or two someone actually uses. That signal — curation — is exactly what generic AI search lacks. The agent's job is to make curation queryable.

---

## Use cases (the reason this exists)

### 1. "I need a tool for X" — the daily driver

Current search only matches substrings in title/URL. Describe the need instead of guessing the name.

- "something to test color contrast"
- "free OG image generator"
- "react library for drag and drop"
- "a newsletter about design engineering"

None of these reliably match titles. All of them match descriptions semantically.

### 2. "I know I saved this" — recall for me

The classic bookmarking failure mode: I remember what it *felt* like, not what it was called.

- "that site with the generative gradient art"
- "the portfolio with the terminal aesthetic"

The description-based search box can't do this today. The agent can.

### 3. Guided discovery — taste as an answer

Shuffle/newest/liked are exploration without intent. The agent adds intent:

- "I just became a design engineer, what should I follow?" → 2 newsletters + 3 articles + 1 tool, with one line on why each.
- "show me portfolios with strong motion work" → recommendations, not rows.

Search returns a list. The agent returns an answer.

### 4. Newsletter drafting — saves me real hours (admin-only)

The Buttondown draft route exists but is dumb: I hand-pick links, it templates markdown. The agent version: "draft this week's newsletter" → it takes new links + top-liked ones, groups them, writes a one-line summary per link using descriptions + my saved notes. I edit, schedule, done.

### 5. Agent-facing search API — other agents as users

`llms.txt` + `llms-full.txt` already say "agents welcome". Add `POST /api/insights/search`: any agent (mine in Cursor, a stranger's Claude) can use the collection as a tool instead of scraping. This is also the exact endpoint HackerNews data plugs into later.

---

## What the agent is

A single tool-calling loop with **one tool**:

```
user question
  → LLM decides to call search_links(query, category?)
      → embed query → vector search top-8 → return link objects
      → (optional second call with refined query — the loop part)
  → LLM answers: 1–2 sentence framing + ≤5 cited links with a "why it fits" line each
  → streamed to the UI
```

The model only ever sees retrieved links. It cannot invent URLs — every link in the answer comes from a tool result. If retrieval returns nothing good, it says so and points at the browse categories. Honesty is a feature, not a failure state.

### What makes the retrieval good

- **Embed the right text**: title + description + category label + domain + my personal notes (joined from `curated_links` by normalized URL when they exist). Notes are earned context nobody else has.
- **Blend ranking**: vector similarity + like count (quality signal from real visitors). 5 most-liked of the top-8 can be re-ranked up.
- **Dedupe first**: same `dedupeByUrl` logic as the page, before embedding.

---

## Stack decisions

| Piece | Choice | Why |
| :--- | :--- | :--- |
| Framework | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | The standard. `streamText`, tool calling, structured output — the stuff to learn. |
| Chat model | `gpt-4o-mini` (swap-ready) | Tool loop is cheap and fast; a personal site doesn't need a frontier model. |
| Embeddings | `text-embedding-3-small` | 700 docs × ~50 tokens ≈ $0.001 total. Effectively free. |
| Vector store | Upstash Vector | Already using Upstash for likes. Zero new infra, REST API, free tier dwarfs this scale. (pgvector on Neon is the alternative; more "standard" but more setup for zero gain at 700 rows.) |
| Sync job | Existing Trigger.dev `check-discord-links` task | It already detects new links — add an embed-and-upsert step. No new cron. |
| Rate limiting | `@upstash/ratelimit` on Upstash Redis | Public endpoint needs a leash. 10 queries/day per visitor, 5/min burst. |
| Visitor identity | Reuse the `visitor_id` cookie pattern from the likes API | No accounts, no new auth. |
| Analytics | PostHog (already installed) | Event `insights_agent_query` + existing UTM params on click-outs = the funnel. |

Model choice is deliberately one line in one file — swap to Haiku or whatever later. That file is the "LLM boundary" worth learning to draw.

---

## Files and endpoints

```
src/lib/insights/
  embed.ts        // build embed text per link, call embed(), upsert to Upstash Vector
  search.ts       // query → top-k, blended ranking (similarity + likes from Redis)
  prompt.ts       // system prompt + answer rules (the only place the agent's personality lives)
  model.ts        // the one-file model config

scripts/embed-insights.ts
  // one-off backfill: pull getDiscordData(), dedupe, embed, upsert. Also the eval-time reset.

src/app/api/insights/search/route.ts
  // POST { query, category? } → top links. Public, rate-limited. Use case #5.

src/app/api/insights/chat/route.ts
  // POST messages[] → streamText with search_links tool. Public, rate-limited harder.

src/app/curated-links/components/AskPanel.tsx
  // the UI
```

`search_links` tool input (zod is already installed):

```ts
{ query: string, category?: "reading-list" | "resources" | "product-hunt" | "newsletters" | "fav-portfolios" | "tools" | "design-inspo" }
```

---

## UI

- Sparkles button in the existing app bar (next to search) → opens `AskPanel` as a side panel on desktop, full-screen sheet on mobile.
- Empty state shows 4 suggested chips = the use cases above ("Find a tool for…", "What should a new design engineer follow?", etc.). Chips teach visitors what this thing is for.
- Answer rendering: short prose, then link cards (favicon, title, domain, like count, one-line "why it fits"). Cards open the real URL with existing UTM params.
- Honest failure renders plainly: "Nothing in the collection matches that — closest is the Resources category." No apology loops.
- No chat history, no persistence. Refresh = clean slate. (v0.1.)
- Organic touchpoint: when the existing substring search returns 0 results, show "Nothing matches — ask the agent?" as a link that opens the panel with the query pre-filled.

---

## Guardrails

System prompt rules, in order:

1. Answer only with links from tool results. Never write a URL that wasn't returned.
2. Cite at most 5 links. If fewer fit, cite fewer.
3. If nothing matches, say so in one sentence and suggest the relevant category.
4. Don't answer general questions ("what is react"). The collection is the universe.
5. Two tool calls max per question.

Cost reality: embeddings are a one-time ~$0.001 + pennies/month for new links. Chat is ~2K tokens/query with k=8 context — cents per hundred queries. The rate limit keeps abuse boring.

---

## Sync flow

1. Trigger.dev `check-discord-links` finds new messages (already happens).
2. New step: for each new link → build embed text → upsert vector (id = snowflake).
3. Likes are never embedded — they're read from Redis at query time so ranking uses live numbers.
4. My notes join at query time too: search hits a URL in `curated_links` → prepend my note to what the model sees.

---

## HackerNews extension (later, designed for now)

Everything above treats Discord as one `LinkSource`. Make that explicit:

```ts
interface LinkSource {
  name: string;                    // "discord" | "hn"
  fetchLinks(): Promise<LinkData[]>; // same shape discordApi already returns
}
```

HN becomes: fetch stories via the Algolia API (`hnUtils.ts` already talks to it), comments' text as description, store `source: "hn"` in vector metadata, add an optional `source` filter to the search tool. The chat loop, UI, and rate limits don't change at all. That's the whole migration — keep it that small.

---

## Build order

Each step is shippable and testable alone.

0. **Search API** — backfill script + `/api/insights/search`. Verify with curl before any LLM exists.
1. **Eval set** — ~25 test queries → expected URLs, committed to the repo. Script runs the search function (no LLM) and reports hit-rate@5. This is how I know retrieval works before trusting a model with it.
2. **Chat endpoint + AskPanel** — the tool loop, streaming UI, suggested chips.
3. **Auto-sync** — embed step inside the Trigger.dev task.
4. **Newsletter drafting** — admin-only command using the same search + notes. (Its own small spec when I get here.)

---

## How I know it's good

- Eval set hit-rate@5 ≥ 80% before the chat UI ships.
- Asking beats cmd+f: vague recall queries (use case #2) find the link in one try.
- PostHog shows queries → click-outs from real visitors (UTM tracking already exists).
- I actually use the newsletter drafter instead of writing summaries by hand.

---

## Explicitly out of scope

- Scraping full page contents of links. OG descriptions + my notes are enough; crawling 700 pages adds cost, staleness, and breakage for marginal gain.
- Chat history, accounts, saved conversations.
- Adding links via the agent. Discord stays the intake; the agent is read-only.
- The agent writing anywhere (no auto-posting, no auto-tagging, no dead-link cleanup). Read-only means nothing to clean up when it misbehaves.
