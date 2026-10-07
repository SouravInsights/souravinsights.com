export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { List, Plug, Search } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { linkChunks } from "@/db/schema";
import { getLinks } from "@/lib/links/queries";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";
import { CopyButton } from "@/components/CopyButton";

export const metadata: Metadata = {
  title: "Using the Collection | SouravInsights",
  description:
    "The Insights collection is queryable: two public endpoints for searching it by meaning and reading it as JSON, an MCP server for your editor, plus RSS and llms.txt. No key required.",
  openGraph: {
    title: "Using the Collection | SouravInsights",
    description:
      "Two public endpoints, an MCP server, RSS and llms.txt. The collection as a dataset, no key required.",
    type: "website",
    url: "https://www.souravinsights.com/docs",
  },
};

/**
 * Three doors, in the order the sections appear. Numbering them would imply a
 * sequence the content does not have, so they are just labelled.
 */
const doors = [
  { id: "search", label: "Search by meaning", icon: Search },
  { id: "read", label: "Read it as JSON", icon: List },
  { id: "mcp", label: "Connect an assistant", icon: Plug },
];

/** The site's link treatment, with a focus ring for keyboard users. */
const linkClass =
  "font-medium text-green-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm dark:text-green-500 dark:focus-visible:ring-green-500/40";

/**
 * A titled section with an addressable anchor.
 *
 * Deliberately not `SectionHeader`: that style is an uppercase 13px label, made
 * for sub-sections inside a page. A docs page is *only* these sections, so
 * labelling them at caption size left the page with a title and then nothing.
 * The title tier gives it a middle.
 */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="type-title">{title}</h2>
      {description ? (
        <p className="type-caption mt-2 max-w-2xl">{description}</p>
      ) : null}
      <div className="rule mb-6 mt-4" aria-hidden="true" />
      {children}
    </section>
  );
}

/**
 * A bordered, rounded container. Everything with an edge uses this, so the page
 * has one border language instead of one per block.
 */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card/50 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * One endpoint: verb, path, what it does, and how to call it.
 *
 * The examples live *inside* the card, below a hairline, rather than under it.
 * Rendered apart, a card and its two code blocks read as three unrelated
 * boxes, and the page turns into a stack of containers.
 */
function Endpoint({
  method,
  path,
  children,
  examples,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
  examples?: React.ReactNode;
}) {
  return (
    <Card className="mt-6 first:mt-0">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-md bg-foreground/[0.06] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
            {method}
          </span>
          <code
            className="min-w-0 break-all font-mono text-sm text-foreground"
            translate="no"
          >
            {path}
          </code>
        </div>
        <p className="type-body mt-3 max-w-2xl text-muted-foreground">{children}</p>
      </div>
      {examples ? (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {examples}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Code with a label and a copy button. Deliberately borderless, since it always
 * sits inside a Card: a border here would just be a box in a box. The label is
 * what makes a block scannable, by telling you whether you are looking at a
 * request or a response.
 */
function CodePanel({ label, code }: { label: string; code: string }) {
  return (
    <figure className="bg-foreground/[0.03]">
      <figcaption className="flex items-center justify-between gap-3 py-1.5 pl-4 pr-3">
        <span className="type-label">{label}</span>
        <CopyButton value={code} label={label} />
      </figcaption>
      <pre
        tabIndex={0}
        role="region"
        aria-label={`${label} example`}
        translate="no"
        className="overflow-x-auto px-4 pb-4 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}

/** A caveat, set apart so it reads as an aside rather than more instructions. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-4 max-w-2xl border-l-2 border-border pl-4">
      <p className="type-caption">{children}</p>
    </aside>
  );
}

/** Inline code. Left unstyled, a bare `<code>` in a sentence reads as a typo. */
function K({ children }: { children: React.ReactNode }) {
  return (
    <code
      translate="no"
      className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[13px] text-foreground"
    >
      {children}
    </code>
  );
}

export default async function DocsPage() {
  const links = await getLinks();
  const [passages] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(linkChunks);

  const linkCount = links.length.toLocaleString("en-US");
  const passageCount = (passages?.total ?? 0).toLocaleString("en-US");

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* Wider than a prose column on purpose: the examples are long URLs and
          JSON, and they are the reason anyone is here. The prose inside caps
          itself at max-w-2xl instead, so reading stays comfortable. */}
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-6 sm:pt-24 md:pt-32">
        <FadeIn y={20} duration={0.3}>
          <PageHeader
            title="Using the Collection"
            description="Everything saved here is queryable from outside the site, and none of it needs a key."
          />
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <div className="type-body max-w-2xl space-y-4 text-muted-foreground">
            <p>
              The Insights collection is {linkCount} links I decided were worth
              keeping, and {passageCount} passages of the text inside them. Every page
              has been read and split up, and the passages are embedded, so search
              matches what a page says rather than what it is called.
            </p>
            <p>
              This is the retrieval behind the Ask panel on the{" "}
              <Link href="/curated-links" className={linkClass}>
                Insights page
              </Link>
              , exposed without the chat layer. No model runs, so the same query
              returns the same ranked list every time, and nothing can be invented.
            </p>
          </div>
        </FadeIn>

        {/* The page's own contents, as the first thing you can act on. Plain
            anchors rather than a sticky rail: three links do not need
            machinery, and they survive a reload and a share. */}
        <FadeIn y={16} duration={0.35}>
          <nav
            aria-label="On this page"
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            {doors.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex items-center gap-2 rounded-sm text-green-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-green-500 dark:focus-visible:ring-green-500/40"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="text-[13px] font-medium">{label}</span>
              </a>
            ))}
          </nav>
        </FadeIn>

        <div className="mt-16 space-y-20">
          <FadeIn y={16} duration={0.35}>
            <Section
              id="search"
              title="Search by meaning"
              description="Describe the page you half remember. It finds links by what the pages say, not by their titles."
            >
              <Endpoint
                method="GET"
                path="/api/v1/search?q=…&channel=tools&limit=5"
                examples={
                  <>
                    <CodePanel
                      label="Bash"
                      code={`curl "https://www.souravinsights.com/api/v1/search?q=a%20tool%20to%20check%20colour%20contrast&limit=2"`}
                    />
                    <CodePanel
                      label="JSON"
                      code={`{
  "data": [
    {
      "id": "oklch.fyi",
      "url": "https://oklch.fyi/",
      "title": "OKLCH Color Picker, Generator and Converter",
      "channel": "tools",
      "added_at": "2025-07-07T19:46:08.060Z",
      "score": 0.4696,
      "passage": "If your display supports Display-P3, you will see the right colors…"
    }
  ],
  "meta": { "query": "a tool to check colour contrast", "count": 1 }
}`}
                    />
                  </>
                }
              >
                Saved links whose contents match a plain-language query, closest
                first. <K>channel</K> narrows it to one category, and <K>limit</K> caps
                the results at 20 and defaults to 8.
              </Endpoint>

              <Note>
                <K>score</K> is the cosine similarity between your query and the page,
                so higher is closer. Below roughly 0.45 a match tends to share a topic
                without answering it, which is the line the Writing Desk uses
                internally. <K>passage</K> is the text that actually matched, so
                anything you quote can be attributed.
              </Note>
            </Section>
          </FadeIn>


          <FadeIn y={16} duration={0.35}>
            <Section
              id="read"
              title="Read the collection"
              description="The same list the Insights page renders, as JSON."
            >
              <Endpoint
                method="GET"
                path="/api/v1/links?channel=tools&limit=50&cursor=…"
                examples={
                  <>
                    <CodePanel
                      label="Bash"
                      code={`curl "https://www.souravinsights.com/api/v1/links?channel=tools&limit=1"`}
                    />
                    <CodePanel
                      label="JSON"
                      code={`{
  "data": [
    {
      "id": "celld.dev",
      "like_key": "1391867904382734507",
      "url": "https://celld.dev/",
      "title": "celld: Durable Objects, self-hosted",
      "description": "Durable Objects without the cloud bill.",
      "channel": "tools",
      "added_at": "2026-03-08T09:12:44.120Z"
    }
  ],
  "meta": { "next_cursor": "eyJhIjoiMjAyNi0wMy0wOC…" }
}`}
                    />
                  </>
                }
              >
                A page of links, newest first. Pass <K>?url=</K> for an exact lookup
                instead, and read the next page from <K>meta.next_cursor</K>.
              </Endpoint>

              <Endpoint method="GET" path="/api/v1/channels">
                Every channel, with its visible link count.
              </Endpoint>

              <p className="type-body mt-6 max-w-2xl text-muted-foreground">
                The full reference has every parameter, and a playground to try them
                in. It is generated from the same schemas that validate requests, so it
                cannot drift from behaviour.{" "}
                <Link href="/api/docs" className={linkClass}>
                  Open the reference
                </Link>
                .
              </p>
            </Section>
          </FadeIn>

          <FadeIn y={16} duration={0.35}>
            <Section
              id="mcp"
              title="Connect an assistant"
              description="An MCP server, so Cursor or Claude can search the collection mid-conversation."
            >
              <p className="type-body max-w-2xl text-muted-foreground">
                Point any MCP client at <K>https://www.souravinsights.com/api/mcp</K>.
                It exposes one tool, <K>search_knowledge</K>, backed by the same
                retrieval as the endpoints above. A question asked in your editor and
                one asked on the site find the same links.
              </p>

              <Card className="mt-6">
                <CodePanel
                  label="Config"
                  code={`{
  "mcpServers": {
    "insights": {
      "url": "https://www.souravinsights.com/api/mcp"
    }
  }
}`}
                />
              </Card>

              <Note>
                Cursor reads that from <K>~/.cursor/mcp.json</K>. The endpoint allows 60
                requests a minute per IP. To run it against your own copy of the
                collection instead, the same server speaks stdio from the repository.
              </Note>
            </Section>
          </FadeIn>

          <FadeIn y={16} duration={0.35}>
            <Section
              id="feeds"
              title="Feeds"
              description="For anything that would rather pull the collection than query it."
            >
              {/* Stacked on mobile, two aligned columns on desktop. The site's
                  `list-row` pushes its description to the far edge, which for
                  three short rows leaves a 600px gap that reads as a mistake. */}
              <ul className="max-w-2xl divide-y divide-border/60 border-t border-border/60">
                {/* Plain anchors, not Link: these are route handlers serving XML
                    and text, not pages, so there is no RSC payload to fetch. */}
                <li>
                  <a
                    href="/curated-links/rss.xml"
                    className="group flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4"
                  >
                    <span className="type-heading transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
                      RSS
                    </span>
                    <span className="type-caption">New links, newest first</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/llms.txt"
                    className="group flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4"
                  >
                    <span className="type-heading transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
                      llms.txt
                    </span>
                    <span className="type-caption">
                      A map of this site, written for language models
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="/llms-full.txt"
                    className="group flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4"
                  >
                    <span className="type-heading transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
                      llms-full.txt
                    </span>
                    <span className="type-caption">The collection as plain text</span>
                  </a>
                </li>
              </ul>
            </Section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

