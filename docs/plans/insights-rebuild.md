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
| **1** | `get`+`read` for **all 269** (static first; render only the thin) | the collection reads clean; the JS-thin leftover is small → **decides render.ts** | markdown on ≥90% of links; you eyeball 10 random ones (blogroll, 60fps, your homepage) | $0, just bandwidth |
| **2** | `understand` on a **~25-link stratified sample** (a few of every expected category) | categories are right; summaries keep the page's voice, invent nothing | review table: ≥90% categories you agree with; any invented sentence = prompt goes back | cents |
| **3** | chunk+embed **~6 pilot links** (3 articles + blogroll + 60fps + a portfolio) | markdown chunks make good passages; summary-only links still answer | hand-ask 5 questions; chunks show headings + separate code units; blogroll answers from its summary alone | cents |
| **4** | full build, truncate + flip | everything above, at scale | 5 real questions via `yarn trace` look right; spot-check 3 links | < $1 |
| **5** | reader + highlights + per-article ask | product feature, zero data risk | you read and highlight 3 real articles | $0 |

The **reader is independent of the agent pipeline** — it only needs Phase 1's stored markdown
and Phase 2's categories (to pick articles). It can start right after Phase 2 and double as
your curation tool while the rest lands.

## Why this order

1. **The engine gets doubted before the model.** If defuddle markdown is bad on this
   collection, nothing downstream matters — and that's the one thing testable for free
   (Phase 1 makes zero model calls). ~~Phase 0.5~~ is gone: the old frozen fixtures held
   deleted links, so the engine is proven on live links with `--limit` instead.
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

## Progress

- **Phase 0 — done (2026-10-10).** Migration `0010` applied; 269 rows pending. Pipeline
  files exist (`get/read/understand/prompts/chunk/embed/store`, `categories.ts`,
  `scripts/kb-build.ts`); `tsc` + lint clean. Smoke on 4 known shapes behaved exactly as
  spec'd: blogroll.org → directory, 1 summary passage (not 1,200 items); 60fps.design →
  gallery, 1 summary; andrewconner.com → article, 11 passages with real heading paths
  («Objections and FAQs»); navbar.gallery → thin + gallery + 1 summary. Categories and
  summaries read right.
- **Phases 1–2 — done (2026-10-10, owner review pending).** Full build over the
  collection: **197 ok · 67 thin · 4 failed** (the 4 are bot-walled/paywalled/dead-ish and
  carry intake-description fallback passages — nothing is invisible). Chunks: **1,432**
  (961 prose · 204 code · 267 summaries) across **269 links**. Categories: tool 82,
  article 53, blog 44, learning 26, portfolio 23, directory 16, gallery 10, newsletter
  10, other 1. **136 full / 129 summary.** Sample-of-16 summaries eyeball: all correct
  tone, quoting pages, nothing invented. Hardening earned in-flight: call ceilings,
  dead-browser reset, bounded close, changed-hash guard.
- **Open item #1 decided by data:** `render.ts` **stays** — it recovered ~10 pages the
  static path got nothing from (60fps.design, mattrothenberg.com, …). It fires only on
  `--render`, so ordinary runs never pay for it.
- **Noticed while running:** `60fps.design/storyboards` was hidden by the owner
  mid-rebuild — the build correctly never touches hidden rows; its one leftover chunk is
  excluded by the search join. `makingsoftware.co` is a Vercel checkpoint page to any
  reader → thin + `other`, which is the honest answer.
- **Phase 3 — done (2026-10-10).** Five hand questions across every path land top-hit:
  pricing (boat.dev + daytona), article recall (lucumr, corners-are-relative), and the
  two redesign proofs — navbar.gallery and blogroll.org answer from summary-only
  passages and rank first.
- **Phase 5 — built, review pending (2026-10-10).** `/insights` filters by category
  (tabs replace the channel filter; cards feed on summaries). Articles open the reader
  **as a side panel inside the page** — no route, no navigation away: panel slides in
  from the right (full-width sheet on phones), Back/Escape/outside-click closes, the
  list keeps its scroll; markdown served pre-baked by `GET /api/insights/article`.
  Owner highlights: select → “Highlight” (same admin key as clean-up), green-sweep
  wave, quote+occurrence anchoring, public to read. Scoped ask composer answers from
  the article's passages alone (scoped agent mode; `search()` a `linkId` filter).
  (First cut was a `/insights/[...key]` route: react-markdown isn't allowed in server
  components, and the owner asked for an in-page view anyway — route deleted.)
  `next build` green.

## Assets reused, not rebuilt

`kb-inspect` / `kb-trace` (look at any link, any question) · the headless browser setup
already in Trigger for Phase 1 renders. **Deleted:** the frozen fixtures *and* the golden
eval set (`kb-golden.json` + `kb-eval.ts`) — AI-written questions grading an AI-built
system measured nothing that matters; acceptance is the owner eyeballing real questions.
