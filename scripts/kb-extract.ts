import "dotenv/config";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { extract } from "../src/lib/kb/extract";
import { chunkText } from "../src/lib/kb/chunk";
import { embedTexts } from "../src/lib/kb/embed";
import { closeRenderer } from "../src/lib/kb/render";
import { mapWithConcurrency } from "../src/lib/links/health";

/**
 * Build the knowledge base: for every link not read yet, extract its text,
 * chunk it, embed the passages, and store them.
 *
 * Usage:
 *   npx tsx scripts/kb-extract.ts                 # all pending links
 *   npx tsx scripts/kb-extract.ts --limit 50      # first 50 (the QA loop)
 *   npx tsx scripts/kb-extract.ts --channel tools # one channel
 *   npx tsx scripts/kb-extract.ts --status failed # re-read links that failed
 *   npx tsx scripts/kb-extract.ts --dry           # read only, write nothing
 *
 * Safe to re-run: it only touches rows still marked `pending`, and it replaces
 * a link's passages wholesale, so a crash mid-run just means "run it again".
 */

const args = process.argv.slice(2);
const flagValue = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = flagValue("--limit") ? Number(flagValue("--limit")) : undefined;
const CHANNEL = flagValue("--channel");
// Which rows to (re)process. Defaults to the unread ones; pass `--status failed`
// or `--status failed,thin` to re-run extraction over rows that came back weak.
const STATUSES = (flagValue("--status") ?? "pending")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DRY = args.includes("--dry");
const CONCURRENCY = 4;
const INSERT_BATCH = 50;

type LinkRow = {
  id: number;
  url: string;
  title: string;
  description: string;
  channel: string;
};

async function pendingLinks(): Promise<LinkRow[]> {
  const conditions = [
    inArray(links.extractStatus, STATUSES),
    isNull(links.hiddenAt),
  ];
  if (CHANNEL) conditions.push(eq(links.channel, CHANNEL));

  return db
    .select({
      id: links.id,
      url: links.url,
      title: links.title,
      description: links.description,
      channel: links.channel,
    })
    .from(links)
    .where(and(...conditions))
    .limit(LIMIT ?? 10_000);
}

const tally: Record<string, number> = {};
let read = 0;
let storedPassages = 0;

async function processLink(link: LinkRow): Promise<void> {
  const result = await extract(link.url, link.channel);
  tally[result.status] = (tally[result.status] ?? 0) + 1;

  // Replace existing passages only when there's text worth keeping. Skipped
  // channels are never fetched — that was the right call — but their title and
  // description still get indexed as one passage, otherwise those ~138 links
  // (portfolios, design, newsletters) are invisible to search and to the agent.
  const text =
    result.text ||
    (result.status === "skipped"
      ? [link.title, link.description].filter(Boolean).join("\n\n").trim()
      : "");

  if (text) {
    const chunks = chunkText(text, {
      title: result.title || link.title,
      channel: link.channel,
    });
    const embeddings = await embedTexts(chunks.map((c) => c.embeddingText));

    if (!DRY) {
      await db.delete(linkChunks).where(eq(linkChunks.linkId, link.id));
      for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
        const batch = chunks.slice(i, i + INSERT_BATCH).map((chunk, j) => ({
          linkId: link.id,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          embedding: embeddings[i + j],
        }));
        await db.insert(linkChunks).values(batch);
      }
    }
    storedPassages += chunks.length;
  }

  if (!DRY) {
    await db
      .update(links)
      .set({
        rawText: text || null,
        contentHash: result.contentHash,
        extractStatus: result.status,
        extractedAt: new Date(),
        updatedAt: new Date(),
        // Backfill the title for links that came in as "Untitled".
        ...(result.title && !link.title ? { title: result.title } : {}),
      })
      .where(eq(links.id, link.id));
  }

  read++;
  if (read % 10 === 0) {
    console.log(`  ${read} done  ${JSON.stringify(tally)}  ${storedPassages} passages`);
  }
}

async function main() {
  const rows = await pendingLinks();
  console.log(
    `KB build: ${rows.length} link(s) [${STATUSES.join(", ")}]${
      DRY ? " (dry run)" : ""
    }${CHANNEL ? ` in #${CHANNEL}` : ""}`
  );

  try {
    await mapWithConcurrency(rows, CONCURRENCY, (link) =>
      processLink(link).catch((error) => {
        console.error(`  ✗ ${link.url}: ${(error as Error).message}`);
        tally["error"] = (tally["error"] ?? 0) + 1;
      })
    );

    console.log(`\ndone: ${JSON.stringify(tally)}`);
    console.log(`${storedPassages} passages stored across ${rows.length} links.`);
  } finally {
    // The render fallback reuses one browser; release it so the process exits.
    await closeRenderer();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
