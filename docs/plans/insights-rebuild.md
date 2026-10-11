# Plan — rebuilding the insights KB without wasting a dollar

How we prove each step before paying for the next one. The what-and-why lives in
[`docs/spec/insights-rebuild.md`](../spec/insights-rebuild.md); this file is only the order,
the gates and the costs.

**The one rule:** no money leaves your pocket until the previous hypothesis survived contact
with your real links.

## Phases and gates

| Phase | Build | Hypothesis it proves | Pass check (your eyes) | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **0** | migration + the 4 files (`get` `read` `understand` `embed`) + defuddle installed | the engine bolts on cleanly | `tsc` green, `--limit` flags work | $0 |
| **0.5** | run `read()` over the **25 frozen fixture HTMLs** — offline, no fetch, no model | defuddle output is real on known pages | 25/25 parse; markdown keeps links, code fences, no chrome | $0 |
| **1** | `get`+`read` for **all 269** (static first; render only the thin) | the collection reads clean; the JS-thin leftover is small → **decides render.ts** | markdown on ≥90% of links; you eyeball 10 random ones (blogroll, 60fps, your homepage) | $0, just bandwidth |
| **2** | `understand` on a **~25-link stratified sample** (a few of every expected category) | categories are right; summaries keep the page's voice, invent nothing | review table: ≥90% categories you agree with; any invented sentence = prompt goes back | cents |
| **3** | chunk+embed **~6 pilot links** (3 articles + blogroll + 60fps + a portfolio) | markdown chunks make good passages; summary-only links still answer | hand-ask 5 questions; chunks show headings + separate code units; blogroll answers from its summary alone | cents |
| **4** | full build, truncate + flip | everything above, at scale | `kb-eval` smoke ≥ v1; spot-check 3 links | < $1 |
| **5** | reader + highlights + per-article ask | product feature, zero data risk | you read and highlight 3 real articles | $0 |

The **reader is independent of the agent pipeline** — it only needs Phase 1's stored markdown
and Phase 2's categories (to pick articles). It can start right after Phase 2 and double as
your curation tool while the rest lands.

## Why this order

1. **The engine gets doubted before the model.** If defuddle markdown is bad on this
   collection, nothing downstream matters — and that's the one thing testable for free
   (Phases 0.5–1 make zero model calls).
2. **The model gets doubted on 25 before 269.** A wrong prompt costs cents to find on a
   sample, $1 and a poisoned index at scale. **You're the acceptance test** — the Phase 2
   review table doubles as the golden set for every future prompt change.
3. **One variable changes at a time.** A bad outcome never leaves you guessing which stage
   caused it.

## Safety while it runs

- **The live site never notices until Phase 4.** Phases 0–3 write *new columns* only;
  `link_chunks` stays v1 until the flip, so Ask/Curio/search keep working in production.
- **Pause the two Trigger cron jobs** during the rebuild window (renamed columns would
  otherwise meet v1 code mid-flight); resume them on the new pipeline at Phase 4.
- **Rollback per phase:** Phase ≤3 → drop the new columns, nothing changed. Phase 4 → the
  re-run is $1, and the old chunks were deleted by then anyway (your call, on record).
- **Failure is local:** any phase fails → fix that stage's assumption, re-run just that
  phase. Nothing forces forward motion.

## Assets reused, not rebuilt

`eval/fixtures` (25 frozen pages) · `eval/kb-golden.json` (retrieval questions) ·
`kb-eval` / `kb-inspect` / `kb-trace` (checks) · the headless browser setup already in
Trigger for Phase 1 renders.
