# 04 — Evals: how we prove it works

"Feels better" is not a metric. The pipeline ships on four checks, cheapest first. After any
change to extraction or chunking, we re-run them and print the numbers — the number moving is
the feedback loop.

## The four checks, and which of them exist

| Check | Needs a model call? | Status |
| :--- | :--- | :--- |
| 1. Extraction | no | **not built** |
| 2. Retrieval | no (embeddings only) | **built** — the ship gate |
| 3. Answer grounding | yes | **not built** |
| 4. Live signals | — | **not wired** |

Only check 2 is a script today. The rest are written down because they are what "done" means — not
because the code exists. Keeping the gap visible is the point: a doc that describes unbuilt things
as if they ran is how you end up trusting a number nobody computes.

## Check 1 — Extraction (offline, deterministic) — not built

**What it would be:** ~30 saved pages (`eval/fixtures/*.html`), each with a phrase that must appear
in the extracted text and a rough word range.
**How:** parse the saved HTML with the real extractor. No network, so it runs in seconds.
**Metric:** pass rate. **Gate: ≥ 90%.**
**Why saved pages:** live pages change, which makes the test flaky. Freezing the HTML once means the
test measures our code, not the internet.

Until it exists, extraction is checked by reading `docs/kb/build-report.md`. That is a measurement,
but a coarse one: it says a page produced 71 words, not that they were the *right* 71 words.

## Check 2 — Retrieval (the ship gate) — built

**What:** a committed set of queries, `eval/kb-golden.json` — 12 answerable, 4 unanswerable.

```jsonc
{
  "answerable": [
    { "query": "a tool to check color contrast", "expect": ["contrast-checker-key"] },
    { "query": "why nested rounded corners look wrong", "expect": ["corners-are-relative-key"] }
  ],
  "unanswerable": [{ "query": "best restaurants in Lisbon" }]
}
```

The queries describe content, not titles, and were written against the real collection.
**How:** `scripts/kb-eval.ts` runs retrieval only — no model.

**Metrics, measured per link** (because citations are links):
- `recall@5` — for how many queries is an expected link in the top 5?
- `MRR@10` — how high does the first correct link rank, on average?
- unanswerable queries: the top score must fall **below `CUTOFF`** (default `0.35`, overridable via
  the `KB_CUTOFF` env var). That cutoff is what lets the agent say "not covered" instead of
  answering from a weak match.

**Baseline:** the same queries through keyword matching over title / description / URL. If semantic
search doesn't beat it, it isn't earning its complexity.

**Gate: `recall@5 ≥ 0.80`, beats the baseline, and the unanswerable queries fall below the cutoff.**

## Check 3 — Answer grounding — not built

**What it would be:** ~20 questions whose answer is in the collection, run through the full agent.
**Assertions:**
1. Every URL cited was returned by a tool call — this must be **100%**. The design guarantees it;
   the check exists to catch whoever changes that later.
2. The expected fact appears in the answer — a keyword match, or a model-graded pass.
**Gate: 0 invented URLs; ≥ 85% of facts present.**

Today this is a manual smoke test. The wiring is real — the UI cannot render a citation that didn't
come from the tool — but nothing is automated.

## Check 4 — Live signals (PostHog) — not wired

- Do people click the cited links?
- Query volume, rate-limit hits, p95 latency, cost per query.

Success looks like: citations get clicked, and cost stays flat.

## Running it

```
npx tsx scripts/kb-eval.ts          # the retrieval scoreboard
npx tsx scripts/kb-eval.ts --json   # machine-readable, for CI
```

Output: the semantic and keyword numbers side by side, then the three gates —
`recall@5 ≥ 0.80`, `beats keyword`, `no-answer cutoff` — and an overall pass/fail.

## Rules that keep it honest

- **Key test queries on `url_key`**, not titles. If a golden link is later hidden, the test should
  fail loudly.
- **Don't tune only against the eval set.** Twelve queries overfit fast. Keep a few holdout queries
  you rarely run.
- **The gates are commitments**, not aspirations. 0.80 is the line below which the agent does not
  ship — but be honest about the sample: 12 queries is a smoke test, not a benchmark. A pass means
  "nothing is obviously broken", not "this is good".
