# Browserbase Fetch vs. our custom extractor — decision analysis

> Question: should the KB extraction pipeline (`insights-agent.md` step 1) use
> Browserbase Fetch instead of the custom fetch + jsdom/Readability + Chromium plan?
> Facts checked against their docs (Oct 2026), not memory.

## What Browserbase Fetch actually is

A hosted "get me this URL" API: `POST /v1/fetch { url }` → response content.

Verified properties:

| Property | Reality |
| :--- | :--- |
| JavaScript execution | **None.** "Fetch doesn't execute JavaScript" — JS-built pages need their *browser session* product instead |
| Output formats | `raw` (HTML), `markdown`, `json` (schema-guided) |
| Markdown/JSON conversion | Branded "Fetch Extract" — **priced separately and higher** ($4/1k vs $1/1k calls on Developer) |
| Size limit | 5 MB per response |
| Browser User-Agent | Included by default |
| Proxy network (bot-wall bypass) | **Locked behind the $20/mo Developer plan**; Fetch+proxy = $4/1k calls |
| Free tier | 1,000 Fetch calls/mo, 5/sec; Extract has **no free allocation** (paid-plan overage only); browser sessions: 1 hour/mo |

## What it would replace in our pipeline — honestly, almost nothing

Our extractor is four stages. Mapping Fetch onto them:

| Our stage | Fetch covers it? |
| :--- | :--- |
| Plain HTTP fetch with browser UA | Yes — but ours already works and costs $0 |
| HTML → clean text (jsdom + Readability) | Only via `markdown` format = **Extract = paid tier** |
| JS-rendered pages (headless Chromium fallback) | **No** — Fetch explicitly can't; browser sessions cost $0.12/hr and the free tier gives 1 hour/month |
| Bot-walled sites (Cloudflare & co.) | Only with proxies = $20/mo plan |

The one piece we'd actually consume for free (raw HTML retrieval) is the piece that costs us
nothing today. The pieces that cost effort (text extraction, JS rendering) are either paid or
absent.

## What the custom implementation gives that Fetch can't

1. **JS rendering for free.** The link-preview feature already runs headless Chromium
   (`@sparticuz/chromium` + `puppeteer-core` are installed and in production). The fallback
   stage reuses that pattern at $0/marginal cost. With Browserbase, this exact need — the
   hard one — routes to the paid browser-hours product.
2. **Determinism for evals.** The eval plan tests the extractor against saved HTML fixtures —
   our code's output on frozen input. A vendor's markdown conversion changes silently whenever
   they update it; fixtures stop measuring our code.
3. **Control over the artifact.** `content_hash`, chunking, and the `{title} — {channel}`
   context headers all operate on *our* exact text output. Vendor-formatted markdown is a
   moving target we don't control.
4. **No new vendor account/key/billing surface** for a site whose total monthly AI budget is
   ~$1.
5. **The learning is the point.** This project exists to learn RAG/agent plumbing for real
   (portfolio + AI company interviews). Extraction is where the hard, resume-relevant lessons
   live (fallback ladders, bot walls, JS rendering, determinism). Outsourcing the pipeline's
   hardest stage deletes the lesson.

## Where Browserbase genuinely wins (the honest other side)

- **Bot walls at scale.** Their proxy network + identity stack beats anything we should
  hand-build. Our snapshot measured this need directly: 9 of 510 links were uncheckable
  (~1.8%). Not worth $20/mo; worth noting.
- **Volume.** At 100k pages of arbitrary hostile sites (e.g., an HN firehose), managed
  fetching with retries/proxies is cheaper than our time. We are at ~360 pages, growing by a
  handful per week.
- **Zero ops.** No Chromium-anywhere problem (the review flagged: Chromium must be reachable
  where extraction runs — local script, Trigger.dev). A vendor makes that someone else's
  problem.

## Cost math at our actual scale

```
Backfill:            ~360 deep extractions, once
New links:           ~5–20/week
Weekly re-reads:     ~50 most-recent links

Custom pipeline:     $0 (infra already owned)
Browserbase useful:  Developer plan $20/mo (proxies + Extract overages)
                     = 20x the rest of the project's monthly AI spend
```

The free tier technically fits our call volume — but the free tier only covers the part we
don't need (raw fetch), not the parts we do (markdown conversion, JS, proxies).

## Decision

**Keep the custom extractor.** Write `extract.ts` behind a one-function seam
(`fetchPage(url) → html`) so a vendor can slot in later — that's a design seam, not
engineering for a hypothetical.

**Revisit only if a measured trigger fires** (per AGENTS.md, observed evidence first):

- uncheckable/failed share of the backfill exceeds ~10% (today: ~1.8%), or
- the corpus grows past ~10k pages, or
- Chromium-in-pipeline proves operationally unreliable after we actually try it.

If a trigger fires later, Browserbase is the right call then — at volumes or hostility levels
where $20/mo is cheaper than our hours. That day is not today.
