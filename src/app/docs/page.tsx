export const revalidate = 300;

import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { linkChunks } from "@/db/schema";
import { getLinks } from "@/lib/links/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Using the Collection | SouravInsights",
  description:
    "The Insights collection is queryable: two public endpoints for reading and searching it by meaning, an MCP server for your editor, plus RSS and llms.txt. No key required.",
  openGraph: {
    title: "Using the Collection | SouravInsights",
    description:
      "Two public endpoints, an MCP server, RSS and llms.txt — the collection as a dataset, no key required.",
    type: "website",
    url: "https://www.souravinsights.com/docs",
  },
};

/** Code that shouldn't be auto-translated or reflowed. */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre
      // Focusable so a keyboard user can scroll a long line; `role` with a name
      // because a scrollable region needs both to be announced properly.
      tabIndex={0}
      role="region"
      aria-label="Code example"
      className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-green-500/40"
      translate="no"
    >
      <code>{children}</code>
    </pre>
  );
}

/** One endpoint: the verb, the path, and a line about what it does. */
function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/60 py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {method}
        </span>
        <code
          className="break-all font-mono text-sm text-foreground"
          translate="no"
        >
          {path}
        </code>
      </div>
      <p className="type-body mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}

/** The site's link treatment, with a focus ring for keyboard users. */
const linkClass =
  "font-medium text-green-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm dark:text-green-500 dark:focus-visible:ring-green-500/40";

export default async function DocsPage() {
  const links = await getLinks();
  const [passages] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(linkChunks);

  const linkCount = links.length.toLocaleString("en-US");
  const passageCount = (passages?.total ?? 0).toLocaleString("en-US");

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-20 sm:px-6 sm:pt-24 md:pt-32">
        <FadeIn y={20} duration={0.3}>
          <PageHeader
            title="Using the Collection"
            description="Everything saved here is queryable — two public endpoints, an MCP server, and feeds. No key required."
          />
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <section>
            <SectionHeader title="What This Is" />
            <div className="type-body space-y-4 text-muted-foreground">
              <p>
                The Insights collection is {linkCount} curated links — articles, tools,
                products, resources and design references — gathered from my Discord
                community. Every page has been read, split into passages, and each
                passage embedded, so search matches what a page{" "}
                <em>says</em> rather than what its title contains. That makes{" "}
                {passageCount} passages searchable.
              </p>
              <p>
                It is the raw material behind the Ask panel on the{" "}
                <Link href="/curated-links" className={linkClass}>
                  Insights page
                </Link>
                , exposed without the chat layer. Retrieval only — no model runs — so the
                same query returns the same ranked list every time, and nothing can be
                invented.
              </p>
            </div>
          </section>
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <section className="mt-16">
            <SectionHeader
              title="Search by Meaning"
              description="Find a page you have forgotten the name of by describing what it said."
            />

            <Endpoint method="GET" path="/api/v1/search?q=…&channel=tools&limit=5">
              Returns saved links whose contents match a plain-language query, closest
              first. <code translate="no">channel</code> restricts it to one category;{" "}
              <code translate="no">limit</code> caps the results at 20, and defaults to 8.
            </Endpoint>

            <Code>{`curl "https://www.souravinsights.com/api/v1/search?q=a%20tool%20to%20check%20colour%20contrast&limit=2"`}</Code>

            <p className="type-body mt-6 text-muted-foreground">
              Each result looks like any other link in the API, plus two fields that
              explain the match:
            </p>

            <Code>{`{
  "data": [
    {
      "id": "oklch.fyi",
      "url": "https://oklch.fyi/",
      "title": "OKLCH Color Picker, Generator and Converter",
      "description": "Convert, generate and explore OKLCH colors…",
      "channel": "tools",
      "added_at": "2025-07-07T19:46:08.060Z",
      "score": 0.4696,
      "passage": "If your display supports Display-P3, you will see the right colors…"
    }
  ],
  "meta": { "query": "a tool to check colour contrast", "count": 1 }
}`}</Code>

            <p className="type-caption mt-4 text-faint-foreground">
              <code translate="no">score</code> is cosine similarity between the query and
              the page — higher is closer. Anything under about 0.45 is topic-adjacent
              rather than a real match, which is the line the Writing Desk uses.{" "}
              <code translate="no">passage</code> is the actual text that matched, so
              anything you quote can be attributed.
            </p>
          </section>
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <section className="mt-16">
            <SectionHeader
              title="Read the Collection"
              description="The whole list, paginated — the same data the Insights page renders."
            />

            <Endpoint method="GET" path="/api/v1/links?channel=tools&limit=50&cursor=…">
              A page of links, newest first. Also takes{" "}
              <code translate="no">?url=</code> for an exact lookup of a single link, and
              hands back the next page in{" "}
              <code translate="no">meta.next_cursor</code>.
            </Endpoint>

            <Endpoint method="GET" path="/api/v1/channels">
              Every channel, with its visible link count.
            </Endpoint>

            <p className="type-body mt-6 text-muted-foreground">
              The full reference — every parameter, every response shape, and a request
              playground — is generated from the same schemas that validate requests, so it
              cannot drift from behaviour:{" "}
              <Link href="/api/docs" className={linkClass}>
                /api/docs
              </Link>
              .
            </p>
          </section>
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <section className="mt-16">
            <SectionHeader
              title="Ask From Your Editor"
              description="An MCP server, so your own assistant can search the collection mid-conversation."
            />

            <p className="type-body text-muted-foreground">
              Point Cursor, Claude Desktop, or any MCP client at{" "}
              <code
                className="break-all font-mono text-sm text-foreground"
                translate="no"
              >
                https://www.souravinsights.com/api/mcp
              </code>
              . It exposes one tool —{" "}
              <code translate="no">search_knowledge</code> — backed by the same retrieval
              the endpoints above use.
            </p>

            <Code>{`{
  "mcpServers": {
    "insights": {
      "url": "https://www.souravinsights.com/api/mcp"
    }
  }
}`}</Code>

            <p className="type-caption mt-4 text-faint-foreground">
              Then ask, in any conversation, “what have I saved about colour contrast?”
              Cursor reads that from <code translate="no">~/.cursor/mcp.json</code>. The
              endpoint allows 60 requests a minute per IP. To run it against your own copy
              instead, the same server speaks stdio from the{" "}
              <a
                href="https://github.com/SouravInsights/souravinsights.com"
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                repository
              </a>
              .
            </p>
          </section>
        </FadeIn>

        <FadeIn y={16} duration={0.35}>
          <section className="mt-16">
            <SectionHeader title="Feeds and Files" />
            <ul className="type-body space-y-3 text-muted-foreground">
              <li>
                <Link href="/curated-links/rss.xml" className={linkClass}>
                  RSS
                </Link>{" "}
                — the collection as a feed, newest first.
              </li>
              <li>
                <a href="/llms.txt" className={linkClass}>
                  llms.txt
                </a>{" "}
                — a map of this site written for language models, including the endpoints
                above.
              </li>
              <li>
                <a href="/llms-full.txt" className={linkClass}>
                  llms-full.txt
                </a>{" "}
                — the collection as plain text, for anything that would rather read all of
                it than query it.
              </li>
            </ul>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}

