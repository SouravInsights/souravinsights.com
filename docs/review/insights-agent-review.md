# Insights Agent — Spec Review

> **Reviewer:** Cline (model: DeepSeek v4.1 flash high). **Adjudicated and expanded by Pi** —
> every issue restated in plain language with an example, a verdict, and what we actually do.
> Read this alongside the plain-language walkthrough in [`../kb/`](../kb/README.md).

## How to read this

A spec review checks whether the plan can be built as written. Each issue below has:

- **Plain** — what the problem is, assuming no background.
- **Example** — the failure happening concretely.
- **Do** — the fix that lands in the build.

The overall plan was confirmed right: registry → extract → chunk → embed → retrieve → agent,
in that order. These are the defects found inside it.

---

## The eight issues from the review

### 1. The extractor named a library that can't do the job

**Plain.** The extractor uses `@mozilla/readability` to turn a web page into clean article
text. Readability needs a full browser-style document object (a "DOM") to walk through. The
spec paired it with `node-html-parser`, which builds a lighter, incompatible structure — the
two don't connect.

**Example.** `new Readability(document.cloneNode(true))` calls `querySelectorAll`,
`getElementsByTagName`, and friends on the parsed document. `node-html-parser`'s root object
implements none of that interface — the call throws.

**Do.** Parse the HTML with `jsdom`, then run Readability on it. Chosen for DOM
completeness — the tradeoff is bundle weight and parse speed, and extraction is offline batch
work where neither matters. No money cost either way.

### 2. The chat model was never named

**Plain.** The spec said "one file knows which models we use" but never wrote down which chat
model. And the agent can only work if the model supports **tool calling** — the ability to
say mid-answer "run `search_knowledge` with this query" instead of just producing text. Not
all models can.

**Example.** On OpenRouter, each model's metadata lists `supported_parameters`. The model
we pick must include `tools` there, or `search_knowledge` can never be invoked.

**Do.** Pin `openai/gpt-4o-mini` in `model.ts` (cheap, tool-capable). Switching later is a
one-line change, but the spec must name what we start with.

### 3. Two rules contradicted each other about extra page fetches

**Plain.** The out-of-scope section said "never fetch pages beyond the saved link itself."
The extraction table said Tools get "homepage + README" and Products get "homepage +
/pricing." Those are second pages. Both rules can't be true.

**Example.** For `github.com/some/tool`, extraction was told to read the README at
`raw.githubusercontent.com/some/tool/HEAD/README.md` — a second fetch, which the out-of-scope
section forbade outright.

**Do.** State the rule precisely: one extra fetch allowed, **same domain only, from an
allowlist** — `/pricing` for products, the raw README (`raw.githubusercontent.com`) for GitHub
repos. Following a link *from* that page is never allowed. That's the difference between
"one more page" and "a crawler."

### 4. Re-reading a shorter page leaves stale passages behind

**Plain.** Articles are stored as numbered passages (chunks 0, 1, 2…). If we re-read a page
and it got shorter, the leftover tail passages from the old, longer version stay in the
database — and can still match searches, quoting content that no longer exists.

**Example.** A page had 10 passages; after an edit it has 7. Passages 8–10 are ghosts unless
deleted.

**Do.** After re-chunking a link, delete chunks whose index is past the new count. One line
in `chunk.ts`.

### 5. Search results must be grouped by link, not taken raw

**Plain.** Vector search returns the *passages* most similar to the question. But the agent
cites *links*. Without grouping, the top 5 passages can all come from the same article — the
agent would cite one link five times and call it an answer.

**Example.** Ask "what should I read about shipping code?" and get five paragraphs of one
seangoedecke essay instead of five different sources.

**Do.** Group the nearest passages by link, keep the best 2–3 per link, then rank the
**links**. Retrieval ranks links; passages are just evidence.

### 6. Likes are too sparse to rank on — dropped

**Plain.** The plan was to boost results by like counts. Measured against the live data: 50
of 500 links have any likes at all (250 total, max 11 on one link). A signal that's zero for
90% of items can't rank anything — it just adds noise.

**Example.** Query "color contrast tool": every candidate has 0 likes, so the boost term is
identical for all of them — pure noise added to a clean similarity score.

**Do.** Rank by similarity alone. The page's "Most liked" sort stays — it's a browsing choice,
not a retrieval signal. (Verified against Redis, not argued from principle.)

### 7. The public fetch tool can be aimed at internal addresses (SSRF)

**Plain.** The Compare experience lets the agent fetch a URL *named in the user's question*,
from *our* server. That means a stranger can make our server request addresses they can't
reach themselves — internal network IPs, `localhost`, cloud metadata endpoints — and read the
response. Our server becomes their proxy. This attack is called SSRF (server-side request
forgery).

**Example.** A visitor asks: "compare with the tool at `http://169.254.169.254/…`" — and our
server dutifully fetches an internal address and shows them the result.

**Do.** When `fetch_link` is built (step 6, not now): allow `http(s)` only, resolve the
hostname and reject private/loopback/link-local IPs, cap body size and redirects. ~15 lines,
written as part of the feature. Also: treat fetched page text as data, never as instructions
(a page could contain text like "ignore your rules" — prompt injection).

**Why this is not over-engineering.** The test: *is the attack just someone using the feature
as designed?* Here, yes — typing a URL is the feature. No improbable behavior chain needed.
By contrast, nothing guards the health checker or extractor: they only fetch URLs the owner
personally curated, so there's no untrusted input to defend. The guard exists exactly at the
one public boundary and nowhere else. Low traffic doesn't change this — SSRF probes are
automated bots, not fans; they don't check popularity first.

### 8. The eval was too vague to act on

**Plain.** "Hit-rate ≥ 80%" left three things undefined. Fixed now:

1. **Measure links, not passages** — citations are links, so a query "passes" when the
   expected *link* appears in the top 5 (`recall@5`). `MRR@10` also records how high the
   first correct link ranks.
2. **Include questions the collection can't answer** (~10 of them). The system must score
   them *below* a similarity cutoff and say "not covered" — instead of confidently returning
   the least-irrelevant link.
3. **Race the old search.** Run the same questions through today's title/URL substring
   search. If semantic search can't beat the dumb one, it hasn't earned its complexity.

Plus: ~30 saved HTML pages as fixtures so the extractor is tested deterministically — our
code is measured, not the internet's mood.

**Do.** Ship gate: `recall@5 ≥ 0.80` at link level, beats the keyword baseline, zero
fabricated URLs, unanswerable queries fall below the cutoff.

---

## What both agents missed (found while adjudicating)

### A. An admin-auth module already existed and the new routes didn't use it

**Plain.** The repo already had `src/lib/admin-auth.ts` (a shared admin login module using
`ADMIN_SECRET` + a cookie session). The new hide/unhide endpoints check the key inline
instead of building on it. Two auth patterns for one admin = they drift apart over time.

**Do.** Share `getAdminSecret()` at minimum; keep the Bearer-token flow (it's the right shape
for fetch calls from the public page) but source the secret from one place.

### B. Passages should carry a tiny context header

**Plain.** We embed raw passages. A passage like *"it also handles soft deletes well"* means
nothing alone — but embedded as *"The challenges of soft delete — Articles: it also handles
soft deletes well"* it becomes findable.

**Do.** Prepend `{title} — {channel}:` to each passage's embedded text in `chunk.ts`. The
cheap version of "contextual retrieval"; one line, no cost.

### C. The eval set decays as the collection is curated

**Plain.** The eval expects specific URLs. As links get hidden or die over time, those
expectations silently fail and the quality gate rots.

**Do.** The eval script warns and skips expectations pointing at hidden/dead links.

### D. Embedding requests need batch bounds

**Plain.** The backfill sends passages to OpenRouter in batches; providers cap inputs per
request. Unbounded batches fail mid-run.

**Do.** Cap batches (e.g. 100 passages per request) in `embed.ts`.

---

## Scale context (read before adding anything)

Traffic will be low at first — the audience is small and growing. Consequences:

- **No extra abuse machinery** beyond the rate limits already shipped. No CAPTCHAs, no
  gates, no queues.
- The **SSRF guard stays** despite low traffic (bots probe regardless) — and it's 15 lines
  inside a feature we're building anyway, not a separate system.
- **The eval rigor stays** too, because this project's purpose is learning — the eval is
  where the learning lives. It's offline; it costs nothing at runtime.
- Everything else: build when a current requirement or an observed failure asks for it
  (per AGENTS.md).

## What holds up (unchanged by the review)

- OpenRouter serves embeddings at `POST /api/v1/embeddings`; `openai/text-embedding-3-small`
  is 1536-dim and matches the existing `vector(1536)` column. No schema change.
- pgvector + HNSW in the existing Postgres, one `getLinks()` read path, `content_hash`
  idempotency, "cite only what the tool returned" — all sound, all as shipped.
- No new framework (Mastra et al.): its RAG component owns its own tables and wouldn't use
  ours. One agent + one tool doesn't justify a framework; the AI SDK is the framework here.

## Decisions locked for the build

1. DOM library: `jsdom`.
2. Chat model: `openai/gpt-4o-mini`, pinned in `model.ts` (verify `tools` support).
3. Second-hop rule: one extra page, same domain, allowlist only (`/pricing`, GitHub README).
4. Ship gates: `recall@5 ≥ 0.80` (link level) and beats keyword baseline; 0 fabricated URLs;
   unanswerable queries below the similarity cutoff.
