# 04 — Evals: how we prove it works

"Feels better" is not a metric. The pipeline ships on four checks, cheapest first. After any
change to extraction or chunking, we re-run them and print the numbers — the number moving is
the feedback loop.

## Check 1 — Extraction (offline, deterministic)

**What:** ~30 saved pages (`fixtures/*.html`). For each, we note a phrase that must appear in
the extracted text and a rough length range.
**How:** parse the saved HTML with the real extractor. No network, so it runs in seconds.
**Metric:** pass rate. **Gate: ≥ 90%.**
**Why saved pages instead of live ones:** live pages change and make the test flaky. We freeze
the HTML once, so the test measures our code, not the internet.

## Check 2 — Retrieval (the ship gate)

**What:** a committed set of queries, `eval/kb-golden.json`:

```jsonc
{
  "answerable": [
    { "query": "a tool to check color contrast", "expect": ["contrast-checker-key"] },
    { "query": "why nested rounded corners look wrong", "expect": ["corners-are-relative-key"] }
  ],
  "unanswerable": [
    { "query": "best restaurants in Lisbon" }
  ]
}
```

The queries describe content, not titles, and are written against the real collection.
**How:** run retrieval only, no model.
**Metrics (measured at the link level, since citations are links):**
- `recall@5` — for how many queries is an expected link in the top 5?
- `MRR@10` — on average, how high does the first correct link rank?
- For the "unanswerable" queries, the top similarity should fall below a cutoff, so we answer
  "not covered".

**Baseline:** run the same queries through today's keyword search (the title/URL match in
`InsightsList`). If the new search doesn't beat it, it isn't working.

**Gate: `recall@5 ≥ 0.80` and beats the baseline.**

## Check 3 — Answer grounding

**What:** ~20 questions whose answer exists in the collection. Run the full agent.
**Assertions:**
1. Every URL the answer cites was returned by a tool call — this must be **100%** (the design
   guarantees it; the check guards against someone later changing that).
2. The expected fact is present in the answer — a keyword match, or a model-graded pass.
**Gate: 0 invented URLs; ≥ 85% of facts present.**

## Check 4 — Live signals (PostHog)

- Do people click the cited links?
- Query volume, rate-limit hits, p95 latency, cost per query.

Success looks like: citations get clicked, and cost stays flat.

## Running it

```
npx tsx scripts/kb-eval.ts          # prints checks 1–3
npx tsx scripts/kb-eval.ts --json   # machine-readable, for CI
```

The output is a table: each check, its number, its gate, pass or fail.

## Rules that keep it honest

- **Key test queries on `url_key`**, not titles. If a golden link is later hidden, the test
  should fail loudly.
- **Don't tune only against the eval set** — you'll overfit to 30 pages. Keep a few holdout
  pages you rarely run.
- **The gates are commitments**, not aspirations. 0.80 is the line below which the agent does
  not ship.
