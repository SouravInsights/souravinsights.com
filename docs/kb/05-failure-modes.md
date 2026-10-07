# 05 — Failure modes

What can go wrong, how it shows up, and the fix — grouped by stage. The principle behind all of
them: **one failure must never take down the run, and a user must never get a confident wrong
answer.**

## Reading pages (extraction)

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| Bot wall | 403 / 429 on the plain fetch | retry with the headless browser; else mark `thin` |
| Built with JavaScript | 200, but empty text | run the headless browser; if still empty, `thin` |
| Dead / redirect loop | DNS failure, 404 / 410, > 5 redirects | mark `failed` (dead links were already dropped at intake) |
| Paywall | long page, body cut off | keep what rendered; mark `thin`; don't invent content |
| Render hangs | browser never finishes | hard timeout; fall back to the fetched text; always close the browser |
| Page got shorter | old tail passages linger | delete chunks past the new count |
| Huge page | tens of MB | cap the size (~5MB); truncate |

## Embedding and storage

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| API rate limit / error | a partial run | batch the requests and retry; a re-run resumes safely |
| Model swapped | vectors from two models mixed, silently | store which model made each vector; re-embed as a query |
| Wrong vector length | insert fails | the length is fixed by the model (1536); the column and `model.ts` must agree |

## Retrieval

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| One page fills the results | many chunks, one link | group by link; keep 2–3 per link |
| A hidden/dead link appears | a deleted link still shows | filter in the query: not hidden, not dead |
| Nothing relevant | the weakest chunk returned as if relevant | a similarity cutoff → "not covered" |

## The agent

| What goes wrong | How it shows up | Fix |
| :--- | :--- | :--- |
| Invents a link | the model writes a URL it never received | render citations only from tool results |
| Prompt injection | page text says "ignore instructions…" | wrap retrieved text in delimiters; treat as content |
| Runaway loop | many tool calls, cost spikes | cap steps and calls per question |
| Abuse | one IP burns the budget | per-IP daily cap, in addition to the per-minute limit |
| Tool unavailable | database down | plain message; the page is unaffected |

## Security (the ones that matter most)

- **SSRF** via the public `fetch_link`: allow http(s) only; resolve the address and reject
  private/loopback addresses; cap size and redirects.
- **Cost abuse** via the public agent: a rate-limit *and* a hard per-IP cap. A model call is not
  a web request.
- **Untrusted text**: never treat extracted page text as instructions.

## The pattern behind every fix

Every fix is one of three moves: **escalate** (try the next rung), **degrade** (mark `thin`, say
"not covered"), or **cap** (limit time, size, count, or rate). None of them is "hope it works".
