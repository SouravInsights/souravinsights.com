# Insights Agent — Spec Review

> **Reviewer:** Cline — **model: DeepSeek v4.1 flash high**
> **Reviewed:** `docs/spec/insights-agent.md` (+ `links-registry-and-api.md`)
> **Method:** read both specs and the shipped code (`src/db`, `src/lib/links`, `src/trigger`,
> `src/app/api/v1`); checked external claims against their own docs (OpenRouter embeddings,
> Mozilla Readability, Mastra).

## Verdict

The plan is right and the order is right: registry → extract → chunk → embed → retrieve →
agent. The registry is already built underneath it. Three things stand between the spec and a
clean build:

1. One **wrong library** in the extractor (Readability needs a real DOM).
2. One **unnamed decision** (the chat model).
3. One **self-contradiction** (it says no second-hop fetches, then fetches `/pricing`).

Fix those three and the rest is normal build work.

Note: the spec is a spec — third-party libraries not being installed yet is expected, not a
finding. This review does not flag that.

## What holds up

- OpenRouter serves embeddings at `POST /api/v1/embeddings` (OpenAI-compatible);
  `openai/text-embedding-3-small` is 1536-dim, matching the existing `vector(1536)` column, so
  no schema change. (checked against OpenRouter docs)
- `pgvector` + HNSW instead of a separate vector store.
- One read path (`getLinks()`), idempotency via `content_hash`, and "cite only what the tool
  returned" — all sound.

---

## Issue 1 — The extractor names a library that can't do the job (blocking)

The spec says `@mozilla/readability` + `node-html-parser`. Readability's own README states it
needs a **DOM document** (`document.cloneNode(true)`, `querySelectorAll`, …); in Node that
means **jsdom or linkedom**. `node-html-parser` is a static parser with a different interface
and will not work here.

**Fix:** pick `linkedom` (lighter) or `jsdom` (safer). This is a library *choice*, not an
install step.

## Issue 2 — The chat model is never named (blocking)

`model.ts` "knows which models we use," but no chat model id appears anywhere, and the
$0.001/query figure assumes one. The model **must support tool calling**, or the agent loop
cannot run.

**Fix:** name one tool-capable model id, pin it in `model.ts`, and note that its
`supported_parameters` must include `tools`.

## Issue 3 — "No second-hop links" contradicts the strategy table (blocking)

Out-of-scope says crawling is forbidden, but the Articles/Tools/Products rows say "read the
README" and "homepage + /pricing" — those are second URLs.

**Fix:** state the rule precisely. The only extra fetch allowed is **same-domain, one page,
from an allowlist** (`/pricing`; `raw.githubusercontent.com` for GitHub READMEs). Never a
spider. Then the two sections agree.

## Issue 4 — Re-chunking a shorter page leaves stale passages

Chunks upsert on `(link_id, chunk_index)`. If a page later gets *shorter*, the old tail chunks
stay and remain searchable.

**Fix:** after re-chunking a link, delete chunks whose `chunk_index` is past the new count.

## Issue 5 — Retrieval returns many chunks of one page

The spec says "top-k chunks," but the five nearest chunks can all be the same article, so one
page fills the result.

**Fix:** group chunks by link, keep the best 2–3 per link, then rank the **links** (citations
are links, so rank at the link level).

## Issue 6 — Drop the like-boost (the data is too sparse to use)

The spec says retrieval "boosts by like counts." The collection gets too few likes for that to
carry any signal, so ranking on it is just noise.

**Fix:** rank by similarity alone, after grouping chunks by link (the closest chunks can all be
one page). Don't rank on likes.

## Issue 7 — The public fetch tool can reach internal addresses (security)

`fetch_link` fetches a URL a user supplies, from our server — an SSRF risk
(`http://169.254.169.254`, `localhost`, private ranges).

**Fix:** allow http(s) only; resolve the host and reject private/loopback/link-local IPs; cap
body size and redirects. Also treat page text as data, not instructions (prompt injection).

## Issue 8 — The eval is too vague to act on

"~30 queries → hit-rate@5 ≥ 80%" leaves out: link-level vs chunk-level (must be **link**), no
answer queries, and a **baseline** (today's keyword search) that proves semantic search
actually helps.

**Fix:** `recall@5` and `MRR@10` at the link level; ~10 no-answer queries that must fall below
a similarity cutoff; run the same set through the current substring search and require the new
one to win. A few saved HTML pages also make a deterministic extractor test.

## Minor

- `ok` / `thin` / `failed` need thresholds (proposal: `thin` under ~200 words).
- A model swap is undetectable without recording which embedding model made each vector — one
  small marker column, or a `kb_meta` row.
- `/api/v1/search` should be wired into the same zod → OpenAPI flow as `/links`.
- Confirm Chromium is reachable where extraction runs (the Trigger.dev task and the local
  script), not only in the Vercel route.

---

## Should we use a framework? (Mastra, or an evals tool)

Short answer: **no new framework — the Vercel AI SDK already is the one that matters.**

| Option | Verdict | Why |
| :--- | :--- | :--- |
| **Vercel AI SDK** (`ai` + `@openrouter/ai-sdk-provider`) | **Use it** | It gives the agent loop, tool calling, and streaming. That is the boilerplate a framework exists to avoid — and it's already the choice. |
| **Mastra** (`@mastra/rag`, `@mastra/pg`) | **Skip** | Its RAG pieces are solid, but `PgVector` creates and owns its *own* table — it would not use our `link_chunks`, and wouldn't know our `links` join, hidden/dead filter, or ranking rules. We'd duplicate data or fight it. At ~500 links our chunk/embed/search code is ~100 lines. Mastra pays off with many agents, workflows, and memory; we have one agent and one tool. |
| **Eval framework** (Mastra evals, promptfoo, Braintrust) | **Skip for now** | Mastra's evals score *model output* (relevancy, toxicity), not retrieval `recall@5`. Ours is deterministic retrieval math — a ~60-line script. A framework adds config for little gain at this size. |

**What actually reduces bugs here:** TypeScript end-to-end + zod (already in the repo), the AI
SDK for the loop, and the eval script as a regression gate on every ingest change. Nothing more
is justified by the current requirements.

## Decisions to make first

1. DOM library: `linkedom` vs `jsdom`.
2. Chat model id (tool-capable), pinned in `model.ts`.
3. Confirm the scoped second-hop rule (allowlist: `/pricing`, GitHub raw README).
4. Eval gates: `recall@5 ≥ 0.80` and beats baseline; 0 fabricated URLs.

