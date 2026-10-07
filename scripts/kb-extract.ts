import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { extract } from "../src/lib/kb/extract";
import { chunkText } from "../src/lib/kb/chunk";
import { embedTexts } from "../src/lib/kb/embed";
import { mapWithConcurrency } from "../src/lib/links/health";

/**
 * Build the knowledge base: for every link not read yet, extract its text,
 * chunk it, embed the passages, and store them.
 *
 * Usage:
 *   npx tsx scripts/kb-extract.ts                 # all pending links
 *   npx tsx scripts/kb-extract.ts --limit 50      # first 50 (the QA loop)
 *   npx tsx scripts/kb-extract.ts --channel tools # one channel
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
const DRY = args.includes("--dry");
const CONCURRENCY = 4;
const INSERT_BATCH = 50;

type LinkRow = {
  id: number;
  url: string;
  title: string;
  channel: string;
};

async function pendingLinks(): Promise<LinkRow[]> {
  const conditions = [
    eq(links.extractStatus, "pending"),
    isNull(links.hiddenAt),
  ];
  if (CHANNEL) conditions.push(eq(links.channel, CHANNEL));

  return db
    .select({
      id: links.id,
      url: links.url,
      title: links.title,
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

  // Replace existing passages only when there's text worth keeping.
  if (result.text) {
    const chunks = chunkText(result.text, {
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
        rawText: result.text || null,
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
    `KB build: ${rows.length} pending links${DRY ? " (dry run)" : ""}${
      CHANNEL ? ` in #${CHANNEL}` : ""
    }`
  );

  await mapWithConcurrency(rows, CONCURRENCY, (link) =>
    processLink(link).catch((error) => {
      console.error(`  ✗ ${link.url}: ${(error as Error).message}`);
      tally["error"] = (tally["error"] ?? 0) + 1;
    })
  );

  console.log(`\ndone: ${JSON.stringify(tally)}`);
  console.log(`${storedPassages} passages stored across ${rows.length} links.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
