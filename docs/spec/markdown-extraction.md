# Markdown Extraction — Spec

**Status:** decided. **defuddle** is the content engine for every page we read. Markdown is the
storage format. Source analyzed at `~/Documents/Personal/scrape/defuddle` (v0.19.5).

Companion spec: [`classification.md`](./classification.md) — what a link *is*; this doc is how
we *read* it.

---

## The decision

Every page the pipeline reads goes through **defuddle** (`defuddle/node`), and we store its
markdown. Reasons: link targets, headings and code fences survive (plain text destroys them);
the engine is forgiving where Readability was brittle (app-style pages, flattened prose); and
it collapses a pile of our custom code into one maintained dependency.

Pin the version **exactly** (`0.19.5`) and upgrade deliberately — same discipline as the
jsdom pin. The node bundle is CommonJS, so it drops into scripts, Trigger.dev and the route
bundles with no ESM gymnastics.

### How we consume it (the whole menu, decided once)

| Path | Verdict |
| :--- | :--- |
| `defuddle/node` (npm, CJS, takes any Document) | **yes — the pipeline** |
| CLI (`npx defuddle parse`) | fixtures and eyeballing only, never in the pipeline |
| Hosted API at defuddle.md (`GET /<url>`, a paid Worker, source in `website/`) | **no** — own fetch bypasses our SSRF guard, a Worker can't render JS (per its own docs), metered third-party inside a cron, version moves under us. Fine for manual lookups in a browser. |
| `defuddle` / `defuddle/full` (browser bundles) | no — wrong runtime |

## What defuddle does for us (verified in its source)

- **Content extraction** — scoring-based, removes fewer uncertain elements than Readability.
- **Markdown output** — `{ markdown: true }`; its own turndown build with element handlers for
  code, headings, footnotes, math, images, callouts.
- **Boilerplate removal** (`src/removals/`): ads/social selectors, hidden elements, low-scoring
  blocks, small images, boilerplate *content patterns* ("read time", article cards), metadata
  blocks. This is the `clean()` we hand-wrote, done properly.
- **27 site extractors** (`src/extractors/`): twitter/x, github, hackernews, reddit, substack,
  medium, wikipedia, youtube… Threads and repo pages come back as real content, not chrome.
- **Raw-markdown passthrough** — if the page *is* a markdown document (`.md`, raw README), it
  is detected and returned as-is.
- **Metadata** — title, description, author, published, site, image, favicon, language,
  `wordCount`, and `schemaOrgData` (the parsed JSON-LD). One call, no hand-parsing.
- **No browser inside.** It works on a DOM Document; it never executes JS. Rendering stays
  our job (below).

## Our usage contract

```ts
import { Defuddle } from "defuddle/node";

const result = await Defuddle(jsdomDocument, url, {
  markdown: true,
  useAsync: true,          // offline pipeline: extractors may fetch transcripts/comments
  fetch: guardedFetch,     // all extractor HTTP goes through our one network seam
});
// result.content        → markdown to store
// result.title          → backfill for Untitled links
// result.description    → the page's own summary (today: Discord's blurb)
// result.wordCount      → drives ok / thin
```

- **Offline pipeline:** `useAsync: true`, with our own fetch injected so extractor API calls
  (youtube transcript, reddit comments, x oembed) pass through the same seam.
- **Live `fetch_link` tool:** `useAsync: false` — static-only, bounded latency, and the URL is
  user-supplied behind the SSRF guard.
- `includeReplies: 'extractors'` (the default) keeps twitter/reddit/HN threads — that *is* the
  content for those links.

## What dies when this lands

| Custom code today | Replaced by |
| :--- | :--- |
| Readability + `clean()` + boilerplate trimming | defuddle removals + standardize |
| `githubReadme` + `stripMarkdown` + the GitHub special case | github extractor + raw-markdown passthrough |
| Hand meta-tag parsing (title/description/date) | defuddle metadata |
| `Untitled` title backfill | `result.title` |
| Manual word counting for ok/thin | `result.wordCount` |
| `readArticle` internals | one thin `Defuddle` wrapper |

## What stays ours, and why

| Piece | Why it survives |
| :--- | :--- |
| `fetchPage` + `readCapped` (~60 lines) | defuddle exposes **no fetcher** in its node entry. We need the seam anyway: SSRF guard for `fetch_link`, 5MB cap, and sharing one fetched page between defuddle and the render fallback. Small, understood. |
| `render.ts` (headless browser) | defuddle never executes JS. Static parse comes back thin → render → defuddle again on the rendered HTML. Trigger stays word-count-based. |
| The same-domain `/pricing` hop | policy from `insights-agent.md`, not plumbing; reimplemented as `fetchPage` + defuddle. |
| Chunking / embedding / quality gate | downstream of extraction by definition. The chunker becomes **markdown-aware** (headings as structure, fenced code as its own unit kind) in its own follow-up change. |
| `note-only` links (portfolio, newsletter) | still never fetched — intake title + description, defuddle not involved. |

## Downstream effects

- `raw_text` becomes **markdown**; `content_hash` still applies (weekly refresh re-embeds only
  changed pages).
- Classifier input is markdown + defuddle metadata (per `classification.md`).
- Re-read of existing rows through the new reader is a `--status` run, once wired.

## Runtime notes

- CJS bundle, no browser dependency inside defuddle itself; jsdom stays at the pinned 26.1.0
  as our Document source (`docs/kb/02-extraction.md` keeps the pin story).
- `result.parseTime` is measured by the engine — log it during wiring so slow pages are visible.
- `docs/kb/02-extraction.md` is rewritten in the same change that wires this in — the doc
  describes the reader that exists, never one that doesn't.
