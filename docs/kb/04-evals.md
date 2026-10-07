# 04 — Evals: how we prove it works

"Feels better" is not a metric. The pipeline ships on four checks, cheapest first. After any
change to extraction or chunking, we re-run them and print the numbers — the number moving is
the feedback loop.

## The four checks, and which of them exist

| Check | Needs a model call? | Status |
| :--- | :--- | :--- |
| 1. Extraction | no | **built** |
| 2. Retrieval | no (embeddings only) | **built** — the ship gate |
| 3. Answer grounding | yes | **not built** |
| 4. Live signals | — | **partly wired** — questions and citation clicks recorded |

Checks 1 and 2 run as one script. Check 3 is not written, and check 4 is only half instrumented.
Keeping the gap visible is the point: a doc that describes unbuilt things as if they ran is how you
end up trusting a number nobody computes.

## Check 1 — Extraction (offline, deterministic) — built

**What:** 25 saved pages in `eval/fixtures/`, listed in `eval/kb-fixtures.json`. For each, a phrase
that must appear in the extracted text and the word count the reader produced when the fixture was
made.
**How:** `readArticle` — the same reader ingestion uses — over the saved HTML. No network, so it
runs in seconds and gives the same answer every time.
**Metric:** pass rate. **Gate: ≥ 90%.** Currently **25/25**.
**Why saved pages:** live pages change, which makes a test flaky. Freezing the HTML once means the
test measures our code, not the internet.

Two details make it trustworthy:

- **The expected phrase comes from the raw HTML, not from our own output.** It's a window from the
  middle of the longest paragraph in the saved page — so the check asks "did Readability keep the
  body?", not "does it agree with itself?".
- **A page only becomes a fixture if the reader already passes it.** A golden set records the
  behaviour you intend to keep; seeding it with known-broken pages makes the suite permanently red.
  The 10 pages that didn't qualify are printed when you build the set, which is itself useful.

Length tolerance is wide (40–250% of the recorded count). This is a tripwire for "extraction
collapsed", not a diff: a page edit that adds three paragraphs is not a failure.

Rebuild the set with `npx tsx scripts/kb-fixtures.ts` (it hits the network, so run it deliberately —
about 5MB of HTML lives in the repo).

## Check 2 — Retrieval (the ship gate) — built

**What:** a committed set of queries, `eval/kb-golden.json` — 12 answerable, 4 unanswerable.

```jsonc
{
  "answerable": [
    { "query": "why designing agents is still hard", "expect": ["lucumr.pocoo.org/2025/11/21/agents-are-hard"] },
    { "query": "cheapest sandboxes for running AI agents", "expect": ["boat.dev"] },
    { "query": "small sharp tooling for software", "expect": ["brandur.org/small-sharp-tools"] }
    // …12 in total
  ],
  "unanswerable": [
    { "query": "best pizza in rome" }
    // …4 in total
  ]
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

**Where it stands** (`npx tsx scripts/kb-eval.ts`):

| | recall@5 | MRR@10 |
| :--- | ---: | ---: |
| semantic | **1.000** | **1.000** |
| keyword baseline | 0.750 | 0.328 |

All four unanswerable queries landed below the cutoff. The *margin* is worth knowing, though: the
closest was 0.345 against a cutoff of 0.35. That gate passes by 0.005, so a single new unanswerable
query could flip it — which is exactly why the cutoff is a tunable (`KB_CUTOFF`) rather than a
number buried in the code.

## Check 3 — Answer grounding — not built

**What it would be:** ~20 questions whose answer is in the collection, run through the full agent.
**Assertions:**
1. Every URL cited was returned by a tool call — this must be **100%**. The design guarantees it;
   the check exists to catch whoever changes that later.
2. The expected fact appears in the answer — a keyword match, or a model-graded pass.
**Gate: 0 invented URLs; ≥ 85% of facts present.**

Today this is a manual smoke test. The wiring is real — the UI cannot render a citation that didn't
come from the tool — but nothing is automated.

## Check 4 — Live signals (PostHog) — partly wired

Recorded today, from the panel:

- `insights_asked` on every question — the question itself and its length.
- `insights_citation_clicked` on every citation click — url, channel, position in the list.

Not built: volume, rate-limit hits, p95 latency and cost per query. PostHog could answer those;
nothing on the server side emits them yet, so the honest status is "half instrumented".

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
