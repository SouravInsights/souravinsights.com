<div align="center">
  <a href="https://www.souravinsights.com">
    <img alt="Sourav Insights" src="./public/sourav-avatar.jpg" width="96" height="96">
  </a>
  <h1>souravinsights.com</h1>
  <p><strong>My little corner of the internet.</strong></p>
  <p>Essays on design and engineering, a collection of links worth keeping, a reading shelf, films, and a few small things I built for fun.</p>
  <p>
    <a href="https://www.souravinsights.com">Site</a> |
    <a href="https://www.souravinsights.com/blog">Writing</a> |
    <a href="https://www.souravinsights.com/insights">Insights</a> |
    <a href="https://www.souravinsights.com/docs">Collection API</a>
  </p>
</div>

---

I'm a product engineer. I write about design and engineering, keep a collection of links worth keeping, and build small things when I get curious. This repo is all of it.

It's a personal site, so it's a workshop. Some of it is finished, some of it is experiments I haven't thrown away yet, and it changes whenever I learn something worth writing down.

## What's here

| | |
| :--- | :--- |
| **Writing** | Essays, kept as MDX in `src/content/posts` and rendered statically |
| **Insights** | Around 490 saved links, searchable by meaning rather than by title |
| **Shelves** | The books and the films I've finished |
| **Projects** | Side projects, and a few toys that live in the footer |

## The collection

Most of what I save is worth keeping and impossible to find again, which is a silly problem to have.

“The article about why nested rounded corners look wrong” found nothing, because the article is called *Corners are relative* and search only ever looked at titles.

So every saved page is now read, split into passages and embedded. Around 2,800 passages sit behind it, and search matches what a page says instead of what it is called. Ask the panel on the Insights page a question and it answers with links it actually retrieved, so it cannot cite something that does not exist.

Two weekly jobs keep that honest: one checks the links are still alive, the other re-reads a slice of the collection so pages that changed do not go stale.

## Reading the code

Where I would start:

- **`docs/kb/`** explains how the collection works, from zero, with the reasoning behind each choice.
- **`docs/spec/`** is what got built, including a section naming every place the build disagreed with the plan.
- **`docs/review/`** is the critique of the original spec, and why the extractor is not a hosted service.
- **`/docs` on the live site** explains how to query the collection from code or an agent.

## Built with

Next.js App Router and TypeScript, with Tailwind and shadcn/ui for the interface and Framer Motion for the small animations. The collection runs on Postgres with pgvector, Drizzle for the schema, Upstash Redis for likes and rate limits, and Trigger.dev for the weekly jobs.
