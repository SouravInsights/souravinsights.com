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
| A chip the collection can't answer | a visitor clicks it and gets "not covered" | `kb-suggestions.ts` verifies every chip against the index: score ≥ `MIN_SCORE` (0.35), *and* the item the chip claims to be about must rank in the top three |
| A chip that is true and boring | "updates on React Native development" — answerable, clicked by nobody | the model reads each item's stored opening passage, must name its subject, and `EMPTY_SHAPES` refuses the empty shapes outright |
| Six chips about one link | "where to find design portfolios", "what to include in a design portfolio", "how to present a design project" | one chip per item, and no repeated question |
| A chip promising a prediction | "what UX behaviours will reshape design in 2025" | banned in the prompt by name: no trends, no forecasts |
| A citation that doesn't really support the claim | a published article cites the wrong source | the Writing Desk passes only matches above `0.45` to the model; below that it's topic-adjacency, and a helpful model will write a confident reason for it anyway |
| Chips drift into echoes of link titles | they read like a table of contents, not questions | derive them per channel from the stored passage, phrased as hooks, quota'd by channel size |
| Copy promises a feature that isn't built | the page lies quietly | status lives in one place and the docs match it |

## Security (the ones that matter most)

- **Cost abuse** via the public agent: a per-minute limit *and* a hard per-IP daily cap, both
  enforced before the model is called. A model call is not a web request — the cheap limit alone is
  not enough.
- **Untrusted text**: never treat extracted page text as instructions.
- **SSRF, via `fetch_link`.** Now real, not hypothetical: the tool fetches a URL the *model* chose,
  and the model has just read untrusted page text — so a saved page containing "fetch
  http://169.254.169.254/…" is an attack. The guard: http(s) only; private, loopback and link-local
  addresses refused; the resolved address checked, so a public name pointing inward is refused too;
  **every redirect hop re-checked**, since a public URL can redirect anywhere; a 2MB cap; a 10s
  timeout; and 3 fetches per question.
  **Known gap:** DNS is checked *before* the request, so a hostname that resolves public now and
  private a moment later (DNS rebinding) can slip through. Closing it means pinning the resolved
  address into the connection. Not done, because this runs for one curated collection with a
  three-fetch cap — if it ever takes arbitrary input at scale, pin the IP.
- **A pre-existing surface worth naming.** `/api/link-preview?url=` also fetches any http(s) URL —
  and renders it in Chromium — on nothing but a protocol check. It predates this work and is left
  untouched here, but it is the same class of problem and could adopt the same guard.

## What actually broke

Six of these were not hypothetical. They happened, and each one taught something.

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

**Then the chips became true and boring.** The first derived version paraphrased titles into needs,
and a rule forbidding names ("never name a specific product or person") left it nothing to be specific
*with*: "updates on React Native development", "where to explore creative workspaces". Nothing was
broken. They retrieved well, they passed every gate, and nobody would click one. Fix: hand the model
the stored opening passage instead of the title, require a named subject, quota the channels by how
much there is to read, and refuse the empty shapes in code. Lesson: "answerable" and "interesting" are
different properties, and only the first can be measured — scores for the boring chips and the good
ones sat in the same 0.44–0.70 band, so the gate can guard the promise and not the hook.

**The Writing Desk cited sources that backed nothing.** Its first real run took a draft about RAG
internals and returned three confident citations — none of which supported a single claim. The
collection is design and engineering links; there was nothing in it to cite. The scores explained
it: everything genuinely on point scored 0.53 and above, and everything the model had been handed
scored 0.35–0.44. The model wasn't hallucinating. It had been given marginal matches and asked to
be helpful. Fix: a similarity floor of 0.45, applied *before* the prompt, so weak candidates never
reach it. Lesson: don't ask a model to judge relevance when you can filter for it first.

## The pattern behind every fix

Every fix is one of three moves: **escalate** (try the next rung), **degrade** (keep the
description, mark `thin`, say "not covered"), or **cap** (limit time, size, count, or rate). None of
them is "hope it works".
