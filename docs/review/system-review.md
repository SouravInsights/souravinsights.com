# The Insights pipeline — what we got wrong

> A review of the system as it actually runs. Every number was measured against this repo or
> this database. Written plainly on purpose.

## The thing that was missing the whole time

```
what we built:   fetch → (channel decides everything) → Readability → clean → chunk → embed → store
what we needed:  fetch → classify the page → pick the right extractor → clean → chunk → quality gate → store
```

Nothing in that chain ever asks **what kind of page is this, and what is it doing in my
collection?** We asked which Discord channel I dropped it in, and treated that as the same
question. It is not. I have been dumping links into those channels for years, sometimes
into the wrong one, and a channel name says nothing about a page.

We took the channel too seriously. It is a note I made to myself years ago, and we built
the foundation on it.

**Links arrive in every shape.** Facts first:

- **343 of the 490 visible links have no path — they are root URLs.** That is a fact about
  the URL, and nothing more. A root URL can be a product landing page, a portfolio, a
  gallery, a blog front page or an app.
- Four root URLs, four different shapes: `60fps.design` (a catalogue), `navbar.gallery` (a
  visual gallery), `blogroll.org` (a directory), `thecreativeindependent.com` (a
  publication front page).
- **Channel and shape disagree in both directions.** `resend.com/blog/sunsetting-new-email`
  is an article filed in `product-hunt`. `justinjackson.ca/articles` is a blog index filed
  in `reading-list`. `resources` holds a book, a tutorial site, a directory, a gallery and
  a 1,200-entry blog index.

So neither the channel nor the URL tells you the shape. Only the page does.

The missing stage has exactly one output: **a label recorded on the row**, which then picks
the extractor. What that label should be is **not decided yet** — and it should not be decided
by guessing. The next step is a prototype that collects the classification signals for every
link and writes them to a local file, so the categories come out of the data instead of out of
someone's head.

## The rule that has to work on any page

One question decides, asked of every unit of text before it earns a vector:

> **Does this unit *state* something, or does it only *point* at something?**

| Unit of text | States or points? | Verdict |
| :--- | :--- | :--- |
| `Devyn Defoe on the importance of daily inspiration / October 6, 2026` | **points** — the interview is elsewhere | no vector |
| `Some Blog — someblog.com` (×1,217, `blogroll.org`) | **points** | no vector |
| `Picture Superiority Effect — Impacts: Memorability` (`60fps.design/storyboards`) | **states** | vector |
| `The outer radius must equal the inner radius plus the padding` (an article) | **states** | vector |
| nav patterns as screenshots (`navbar.gallery`) | **neither** — no text at all | the description only |
| `self.attn_dropout = nn.Dropout(config.dropout)` | **states**, but not about the article's idea | its own passage, apart from the prose |

This is what decides admission. Page type still matters — it tells you **which extractor to
run** — but it does not decide what is kept.

Two consequences:

- **The same site gets opposite verdicts.** `60fps.design`'s homepage is UI chrome and a
  tagline repeated four times — near zero knowledge. `60fps.design/storyboards` is
  genuinely useful. Classification is **per page**, never per site and never per channel.
- **Two kinds of list, two opposite verdicts.** The index points at knowledge we don't
  have; the catalogue *is* the knowledge. Judging a list by its shape would delete the best
  page on `60fps.design`.

## We never follow the links

Nobody needs the agent to know all ~1,200 posts on `thecreativeindependent.com` or all the
nav patterns on `navbar.gallery`. Two reasons, both permanent:

- **We shouldn't.** It turns a curated collection into a spider.
- **It wouldn't help.** `blogroll.org`'s 1,505 links point at other people's blogs — pages
  that are not in the collection and are not meant to be. A list of them is a table of
  contents for a book we do not own.

So the only question is what the page states on its own. **Crawling stays out of scope,
permanently** — the registry spec already says it: reading a single same-domain page the
strategy table names is allowed, and *"anything past that is a spider, and out."* The index
pages are the strongest argument for keeping that line.

**A pointer page announces itself, for free.** Measured on the saved pages:

| Page | links | share off-domain | text inside links |
| :--- | ---: | ---: | ---: |
| `blogroll.org` (a directory) | **1,505** | **100%** | **139,512 chars** |
| `ankursethi.com` (an article) | 13 | 15% | 195 chars |
| `baseten.co` (long, nav-heavy article) | 143 | 20% | 1,490 chars |
| `anthonyhobday.com` (an article that cites heavily) | 72 | **86%** | 1,596 chars |

The last row is why "off-domain share" alone decides nothing. The signal is the three
together — many links, link text that is most of the page's text, and off-domain targets.
Of those four pages, exactly one trips all three. No model, no cost.

## The signals we already receive and ignore

| Signal | Coverage in `eval/fixtures` | Says |
| :--- | ---: | :--- |
| `og:type` | **21 / 25** | `article`, `website`, even `skilljar:online_course` |
| meta description | 21 / 25 | the publisher's own one-line summary |
| JSON-LD `@type` | 11 / 25 | `BlogPosting`, `Course`, `SoftwareApplication, Offer` |
| canonical, `generator` | 17, 5 / 25 | the CMS, which correlates with shape |

Two findings, and both argue against reaching for JSON-LD here:

- **The machine-readable list markup is not there. 0 of 25 pages declare `ItemList`,
  `CollectionPage` or `Blog`.** Five declare something list-adjacent and none of those is a
  directory. So the reliable path is `og:type` plus structure, not JSON-LD.
- **`og:description` exists on 84% of pages, and we store Discord's blurb instead** —
  because that is what happened to be at hand first.

## The flaws

### Classification

**1. There is no classification stage.** Nothing knows the difference between an article, a
landing page, a gallery, a directory and a docs page. `links` has no page-type field;
`channel` and `extract_status` say nothing about the page.

**2. The channel gate misfires.** `SKIP_CHANNELS` correctly never fetches portfolios,
design and newsletters — but it assumes everything else is an article. A shape rule wearing
a channel's clothes.

**3. Nothing is tagged**, so nothing can be filtered later: no page type, no topics, no
"just the free ones".

### Extraction

**4. One extractor for everything.** Readability is an *article* extractor, pointed at
indexes, galleries, dashboards, product pages and docs.

**5. Code is stored as knowledge, and no decision about it was ever made.** 416 of 1,723
live passages (24%) contain code. On `baseten.co`, **14 of 18 passages** are code-dominant,
so `self.attn_dropout = nn.Dropout(config.dropout)` sits in the top-60 candidates for a
question about that article's argument.

**6. UI chrome is stored as content.** The copy button's `✕` appears in 13 passages, and
syntax-highlighter line numbers are plain text.

**7. Images contribute nothing** — no alt text, no captions. A page whose value is visual
extracts to nothing.

**8. Tables are run together** — cells concatenated, so a comparison dies on the way in.

**9. Headings are not structure, only text.** A passage cannot say which section it came
from, which is exactly the context you would need to connect two ideas across links.

**10. `sitemap.xml`, `robots.txt`, `llms.txt` and `<nav>` are never read.**

**11. Visually-separated text gets glued together.** Block-rendered pages hand us labels and
values with nothing between them: `Psychology:Signifiers`, `WatchAllFilters`, `1083D`.

**12. Nothing deduplicates repeated text inside a page.** `60fps.design`'s homepage passage
repeats its own tagline **four times** — a marquee animation — so it is four times as
attractive to a query as it deserves.

**13. The stored description is Discord's, not the page's**, even though `og:description`
was available on 84% of pages.

### Chunking

**14. Oversized paragraphs lose every line break.** `splitLongParagraph` joins sentences
with a single space: the reader produces `"1class Block(nn.Module):\n2 def __init__…"` and
the stored passage has **zero** newlines. Across the 25 saved pages, **35 of 203 passages
(17.2%, 19.2% of all tokens)** are near-full size with no newline. Worst case
`andrewconner.com`: 7 of 8 passages, of a *prose* article.

**15. A passage is anonymous** — text plus a `title — channel:` prefix. No section, no
position, no hint of what it could answer.

**16. A 500-token window is assumed to hold one idea.** Nothing checks that it does.

### Storage

**17. Nothing caps how much of the index one link can own** — not bytes, not passages, not
growth between two reads. So one link can quietly *become* the index.

**18. Both failure directions have already happened.** A spam farm that had turned into a
directory of 8,334 `.amp.pr` domains held **1,071 of 2,794 passages (38.3%)** and produced
two confidently wrong citations. `thecreativeindependent.com` holds **122 passages (7.1%)**
which are nothing but ~1,200 titles and dates.

**19. The weekly re-read ingests rot.** A page can turn into a link farm; the refresh
fetched 1.7MB of it and embedded 1,071 passages without complaining.

**20. Nothing ever looked at a single link's stored text**, which is why the spam sat in the
index for months. Two commands now exist for it: `yarn inspect` and `yarn trace`.

### Retrieval

**21. Similarity is treated as if it meant "we can answer this".** The *unanswerable* "how
do I negotiate a higher salary offer" scores **0.597**; the *answerable* "small sharp
tooling for software" scores **0.473**. The groups overlap, and the best possible cutoff
still gets 4 of 22 wrong.

**22. The relevance floor the eval measures is applied by no code.** `search()` takes no
cutoff; `agent.ts` asks for six links and nothing else.

**23. The "we don't cover that" path does not exist.** `docs/kb/03` says the cutoff empties
the search. It does not — the empty branch fires only when the database returns zero rows.

### The agent

**24. The step cap turns an unanswerable question into a dead end.** "best pizza in rome"
searched once *per channel*, hit the 4-step cap on a tool call, and never answered at all —
**15,140 input tokens, 16.7 seconds**, 24 links shown as citations.

**25. "The agent cannot cite a URL that isn't in the collection" is false.** It holds for
citation cards. It does not hold for `fetch_link` cards, where the model picks the URL, nor
for the assistant's prose, which is rendered as Markdown — so any URL the model types
becomes a clickable link, and the prompt asks it to write "the links you used". Three
documents state the stronger, untrue version.

**26. `fetch_link` trusts the model for the address**, and caches whatever it fetched for
24 hours.

### The evals

**27. The eval never touches the agent.** Nothing runs `runAgent()`. Check 3 is marked
*not built*, which means the thing users talk to has no test.

**28. The set is too easy.** The keyword baseline — substring matching on title,
description and URL — already answers **9 of the 12** "answerable" questions.

**29. All four negatives were far-domain**, so they pass any cutoff you could pick. The
question that broke the agent, "Travel?", was *near* the collection and nothing tested
there.

**30. No holdout.** Twelve questions, and `04-evals.md` says so itself.

**31. Nobody checked whether the expected answers were right.** The first hand-read found a
questionable one.

**32. Two documents defined the gate and disagreed.** `04-evals.md` reads `keyword 0.750` as
a pass. It is the problem.

### Operations

**33. A chunking change would never reach existing rows.** The refresh skips re-embedding
when the page text is unchanged, and chunking is not part of `content_hash`. No chunker
version exists anywhere.

**34. There is no cost or latency signal per question** — only a PostHog event on the ask
and on a citation click.

**35. Extraction quality is measured by word count.** `THIN_WORDS = 200` decides
ok / thin / failed, so 400 words of navigation chrome reads as `ok`.

### The docs

**36. The extraction doc says how we fetch and never says what we keep.**
`02-extraction.md` has the ladder, the jsdom pin and the render cap, and not the one
sentence needed to judge the output. The flattening bug is in no document at all.

**37. Review-shaped content was written into the knowledge-base docs.** `docs/kb/` is for
understanding how the thing is built; criticism belongs here.

## What the rule decides, case by case

| Case | Passages today | What deserves a vector | What decides it |
| :--- | ---: | :--- | :--- |
| `securityshare.xyz` (a spam farm that rotted) | 1,071 | 0 | link signals + `og:type` + a size check |
| `thecreativeindependent.com` (publication front page) | 122 | 2–3 | link signals + the state-or-point test |
| `blogroll.org` (directory) | 82 | 1 | the same two signals |
| `60fps.design` (homepage: chrome + tagline ×4) | 5, mostly junk | its description | dedup + the state-or-point test |
| `baseten.co` (code walls) | 14 of 18 code-dominant | prose and code apart | code share |
| `andrewconner.com` (flattened prose) | 7 of 8 flattened | 8 readable paragraphs | fixing `splitLongParagraph` |
| `60fps.design/storyboards` (named techniques) | 1 | 1 | the state-or-point test keeps it |
| `navbar.gallery` (images, no text) | description only | description only | there is no text to keep |

One rule has to produce every row at once — empty the publication front page, preserve the
catalogue, and keep an article's prose readable. We have no such rule today, which is why
all eight outcomes are accidental rather than decided.

## If I were doing it again, in order

1. **Classify before extracting** — shape from `og:type` and JSON-LD, link structure as a
   flag to look closer, and only then one cheap model call per page for the rest.
2. **One extractor per shape**, small and swappable, and the interface has to accept a shape
   it has never seen.
3. **The state-or-point test at chunk time** decides what earns a vector.
4. **Fix the chunker** so it stops destroying line breaks, and version it so the change
   reaches stored rows.
5. **A quality gate** between chunk and store: size, code share, duplicate share, glued
   text.
6. **Then** retrieval and the agent: the missing floor, the missing "not covered" path, and
   an eval that runs the agent instead of the search.
