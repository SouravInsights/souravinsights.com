import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { JSDOM } from "jsdom";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { readArticle } from "../src/lib/kb/extract";

/**
 * Build the extraction fixtures used by check 1 of the eval: a saved page plus
 * what we expect the reader to find in it.
 *
 *   npx tsx scripts/kb-fixtures.ts            # build or refresh the set
 *
 * Freezing the HTML is the whole point. Live pages change, so a test that hits
 * the network measures the network rather than our code.
 *
 * Two rules keep this honest:
 *
 * - **The expected phrase comes from the raw HTML, never from our own output.**
 *   It is a window from the longest paragraph in the saved page, so the check
 *   asks "did Readability keep the body?" rather than "does it agree with
 *   itself?"
 * - **A page only becomes a fixture if the current reader already passes it.** A
 *   golden set records the behaviour you intend to keep; seeding it with known
 *   broken pages would just make the suite permanently red.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
/**
 * Per file. A fixture only has to contain enough for the reader to find the
 * body, and these files are committed — 24 pages at full size is ~7MB of repo
 * for a test. Truncation is safe here: if it cuts the body, the page simply
 * doesn't qualify as a fixture.
 */
const MAX_BYTES = 500_000;
const FIXTURE_DIR = "eval/fixtures";
const INDEX = "eval/kb-fixtures.json";
const DEFAULT_LIMIT = 24;

interface Fixture {
  urlKey: string;
  url: string;
  channel: string;
  /** File under `eval/fixtures/`. */
  file: string;
  /** Must appear in the extracted text — taken from the raw HTML. */
  phrase: string;
  /** Words the current reader produces. The check allows generous tolerance. */
  words: number;
}

const slugOf = (urlKey: string) =>
  urlKey
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

/** The longest paragraph in the raw HTML — independent evidence of the body. */
function longestParagraph(html: string): string {
  const dom = new JSDOM(html);
  let best = "";
  for (const node of Array.from(dom.window.document.querySelectorAll("p"))) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.length > best.length) best = text;
  }
  return best;
}

/**
 * A window from the middle of a paragraph. Deliberately not the opening words:
 * those are the ones a reader is most likely to treat as a heading and drop.
 */
function phraseFrom(paragraph: string): string | null {
  if (paragraph.length < 120) return null;
  const start = Math.floor(paragraph.length * 0.25);
  return paragraph.slice(start, start + 60).trim();
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

async function main() {
  const flag = process.argv.indexOf("--limit");
  const limit = flag >= 0 ? Number(process.argv[flag + 1]) : DEFAULT_LIMIT;

  const rows = await db
    .select({
      urlKey: links.urlKey,
      url: links.url,
      channel: links.channel,
    })
    .from(links)
    .where(
      and(
        eq(links.extractStatus, "ok"),
        isNull(links.hiddenAt),
        ne(links.health, "dead")
      )
    )
    .orderBy(asc(links.urlKey))
    .limit(500);

  // Round-robin across channels, so a busy channel (98 reading-list links)
  // doesn't crowd out a small one (32 design-inspo links).
  const byChannel = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byChannel.get(row.channel) ?? [];
    list.push(row);
    byChannel.set(row.channel, list);
  }

  const picked: typeof rows = [];
  for (let i = 0; picked.length < limit; i++) {
    let added = false;
    for (const list of Array.from(byChannel.values())) {
      if (!list[i]) continue;
      picked.push(list[i]);
      added = true;
      if (picked.length >= limit) break;
    }
    if (!added) break; // every channel exhausted
  }

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const fixtures: Fixture[] = [];
  const skipped: string[] = [];

  for (const row of picked) {
    const res = await fetch(row.url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    }).catch(() => null);

    if (!res?.ok) {
      skipped.push(`${row.urlKey} (fetch: ${res ? res.status : "failed"})`);
      continue;
    }
    if (!/text\/html/i.test(res.headers.get("content-type") ?? "")) {
      skipped.push(`${row.urlKey} (not HTML)`);
      continue;
    }

    const html = (await res.text()).slice(0, MAX_BYTES);
    const phrase = phraseFrom(longestParagraph(html));
    if (!phrase) {
      skipped.push(`${row.urlKey} (no paragraph to test)`);
      continue;
    }

    // Only pages the reader already handles become fixtures.
    const article = readArticle(html, row.url);
    if (!article || !normalize(article.text).includes(normalize(phrase))) {
      skipped.push(`${row.urlKey} (reader misses the phrase)`);
      continue;
    }

    const file = `${slugOf(row.urlKey)}.html`;
    writeFileSync(`${FIXTURE_DIR}/${file}`, html);

    const words = article.text.split(/\s+/).filter(Boolean).length;
    fixtures.push({
      urlKey: row.urlKey,
      url: row.url,
      channel: row.channel,
      file,
      phrase,
      words,
    });
    console.log(`  ✓ ${String(words).padStart(5)} words  ${row.urlKey}`);
  }

  writeFileSync(INDEX, `${JSON.stringify(fixtures, null, 2)}\n`);

  console.log(`\n${fixtures.length} fixtures written to ${FIXTURE_DIR}/ (index: ${INDEX})`);
  if (skipped.length > 0) {
    console.log(`\nskipped ${skipped.length}:`);
    for (const line of skipped) console.log(`  - ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
