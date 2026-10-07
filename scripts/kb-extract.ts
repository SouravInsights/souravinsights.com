import "dotenv/config";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { ingestLink } from "../src/lib/kb/ingest";
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

type LinkRow = {
  id: number;
  url: string;
  title: string;
  description: string;
  channel: string;
  contentHash: string | null;
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
      contentHash: links.contentHash,
    })
    .from(links)
    .where(and(...conditions))
    .limit(LIMIT ?? 10_000);
}

const tally: Record<string, number> = {};
let read = 0;
let storedPassages = 0;

async function processLink(link: LinkRow): Promise<void> {
  // Read → chunk → embed → store lives in ingestLink, shared with the weekly
  // refresh (src/trigger/kb-refresh.ts) so the two paths cannot drift.
  const outcome = await ingestLink(link, { dry: DRY });
  tally[outcome.status] = (tally[outcome.status] ?? 0) + 1;
  storedPassages += outcome.passages;

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
