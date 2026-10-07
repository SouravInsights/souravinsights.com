# 05 — Failure modes

What can go wrong, how it shows up, and the fix — grouped by stage. The principle behind all of
them: **one failure must never take down the run, and a user must never get a confident wrong
answer.**

## Reading pages (extraction)

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| Bot wall | 403 / 429 on the plain fetch | escalate to the headless browser; else keep the description |
| Built with JavaScript | 200, but empty text | run the headless browser; if still empty, keep whatever rung 1 had |
| Dead / redirect loop | DNS failure, 404 / 410, > 5 redirects | mark `failed` (dead links were already dropped at intake) |
| Paywall | long page, body cut off | keep what rendered; mark `thin`; never invent content |
| Render hangs | the browser never finishes | **25s cap on the whole render**; close the page on timeout, which aborts the work |
| A row marked `failed` that actually renders | the link is invisible to search | **one browser per run** (see below), then `--status failed` re-reads it |
| Readability discards an app-style page | `failed`, though the browser saw text | fall back to `document.body.innerText` when Readability finds under 50 words |
| Page got shorter | old tail passages linger | passages are deleted by `link_id` before the new ones are inserted |
| A channel that is never fetched | 138 links invisible to search | index the title + description as one passage |
| Huge page | tens of MB | cap the size (5MB); truncate |

## Embedding and storage

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| API rate limit / error | a partial run | batch the requests and retry; a re-run resumes safely |
| Model swapped | vectors from two models mixed, silently | nothing prevents this yet — the model is named in one file (`model.ts`) and printed in the build report, and a swap means a full re-embed |
| Wrong vector length | insert fails | the length is fixed by the model (1536); the column and `model.ts` must agree |
| A page changes after we read it | the agent answers from a stale snapshot | the weekly `kb-refresh` re-reads 100 links (least-recently-read first); `content_hash` skips the re-embed when nothing changed |

## Retrieval

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| One page fills the results | many passages, one link | fetch 60 passages, group by link, keep up to 3 each, rank the links |
| A hidden/dead link appears | a deleted link still shows | filter in the query: not hidden, not dead |
| Nothing relevant | the weakest passage returned as if relevant | the `CUTOFF` score (0.35) → the agent says "not covered" |
| A passage means nothing alone | "it also handles soft deletes well" matches nothing | embed `{title} — {channel}: {content}`, not the bare passage |

## The agent

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| Invents a link | the model writes a URL it never received | citations are rendered only from tool results |
| Prompt injection | page text says "ignore instructions…" | the system prompt states that retrieved text is data, never instructions |
| Runaway loop | many model round-trips, cost spikes | `MAX_STEPS` (4) caps the loop |
| Abuse | one IP burns the budget | 8/min **and** 60/day per IP |
| Tool unavailable | database down | plain message; the page is unaffected |
| A long wait looks like a hang | the visitor gives up | the panel shows the real phase — "Thinking…", `Searching for "…"…` |

## Content and copy

Two ways the *words* fail — this is where a demo usually loses trust:

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| A chip the collection can't answer | a visitor clicks it and gets "not covered" | `kb-suggestions.ts` runs every chip through `search()` and drops any scoring below `MIN_SCORE` (0.3) |
| Chips drift into echoes of link titles | they read like a table of contents, not questions | derive them per channel, phrased as questions, 6 each |
| Copy promises a feature that isn't built | the page lies quietly | status lives in one place and the docs match it |

## Security (the ones that matter most)

- **Cost abuse** via the public agent: a per-minute limit *and* a hard per-IP daily cap, both
  enforced before the model is called. A model call is not a web request — the cheap limit alone is
  not enough.
- **Untrusted text**: never treat extracted page text as instructions.
- **SSRF**, for when `fetch_link` is built: allow http(s) only; resolve the address and reject
  private/loopback ranges; cap size and redirects. Today no code fetches a user-supplied URL during
  a question, so this risk has no surface yet — which is exactly why it is written down *before* the
  tool exists.

## What actually broke

Five of these were not hypothetical. They happened, and each one taught something.

**The `failed` pile that wasn't.** The first bulk run recorded a large batch of JS-heavy pages as
`failed`. Rendering those same pages one at a time worked fine. The cause was launching a fresh
Chromium *per page*: under concurrency they fought over resources and most came back empty. Fix:
one browser per run, reused, with pages opened and closed against it. Lesson: a fallback that works
in isolation can fail systematically when you run it in parallel.

**One URL that stalled the whole run.** `page.goto` had a timeout, but `document.fonts.ready` and
`page.content()` did not — and a broken page hung there forever, freezing the queue behind it. Fix:
a 25s cap around the *entire* render, plus closing the page on timeout, which aborts whatever is
still running. Lesson: time out the step, not each call inside it.

**Readability threw away the text.** On app-style pages Readability returned a handful of words
while the rendered body had hundreds. The page was fine; our reader was picky. Fix: when Readability
finds under 50 words, keep `document.body.innerText` instead. Lesson: a "smart" extractor needs a
dumb fallback behind it.

**138 links nobody could reach.** Portfolios, design references and newsletters are never fetched —
correct. But "never fetch" had been read as "never index", so the agent could not mention any of
them even though we hold a title and a one-line description for each. Fix: store title +
description as one passage. Lesson: a deliberate skip has to say what *is* still stored.

**The chips became lies.** Hand-written suggestions drifted into echoes of the link titles ("Scale
your Next.js app") — promises the collection doesn't keep. Fix: derive them per channel *and verify
each one against the index* before shipping it. Lesson: the copy is part of the system; it needs a
check too.

## The pattern behind every fix

Every fix is one of three moves: **escalate** (try the next rung), **degrade** (keep the
description, mark `thin`, say "not covered"), or **cap** (limit time, size, count, or rate). None of
them is "hope it works".
