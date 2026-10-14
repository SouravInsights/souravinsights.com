import "./load-env";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { pipelineModel } from "../src/lib/kb/model";
import { PROMPT_VERSION } from "../src/lib/kb/prompts";
import { closeRenderer } from "../src/lib/kb/render";
import { buildLink, settleSpellings, type LinkRow } from "../src/lib/kb/store";
import { buildTopicVocabulary } from "../src/lib/kb/topics";

/**
 * kb-build — the v2 pipeline over rows (docs/plans/insights-rebuild.md).
 *
 *   npx tsx scripts/kb-build.ts                      # every link needing work
 *   npx tsx scripts/kb-build.ts --limit 10           # a sample first
 *   npx tsx scripts/kb-build.ts --only blogroll.org  # one link
 *   npx tsx scripts/kb-build.ts --force              # redo even finished rows (refetches!)
 *   npx tsx scripts/kb-build.ts --render             # render thin pages headlessly
 *   npx tsx scripts/kb-build.ts --render --status thin,failed   # retry the weak set
 *
 *   npx tsx scripts/kb-build.ts --stale   # redo every row an older prompt
 *                                         # version understood (the reclassify)
 *
 * Per link: get → read → understand → embed. Stages skip themselves when
 * their columns are already set — a crash just means "run it again".
 */

const has = (flag: string) => process.argv.includes(`--${flag}`);
const val = (flag: string) => {
  const i = process.argv.indexOf(`--${flag}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const CONCURRENCY = 4;

async function main() {
  const force = has("force");
  const render = has("render");
  const stale = has("stale");
  const only = val("only");
  const limit = val("limit") ? Number(val("limit")) : undefined;

  const statusFilter = val("status")?.split(",");

  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (only) conditions.push(eq(links.urlKey, only));
  if (stale) {
    // The reclassify: rows an older prompt version understood. They all have
    // markdown, so nothing is fetched — the new prompt passes over old text.
    conditions.push(isNotNull(links.markdown));
    conditions.push(
      sql`(${links.promptVersion} is null or ${links.promptVersion} <> ${PROMPT_VERSION})`
    );
  } else if (statusFilter) {
    conditions.push(inArray(links.readStatus, statusFilter));
  } else if (!force) {
    // Rerunnable: read runs while markdown is missing; everything downstream
    // follows from there, so that one check selects the whole unfinished list.
    conditions.push(sql`(${links.markdown} is null or ${links.category} is null)`);
  }

  // A render pass on thin rows is a forced re-read; hash comparison keeps
  // unchanged pages from re-spending model calls (see buildLink).

  let query = db
    .select({
      id: links.id,
      url: links.url,
      urlKey: links.urlKey,
      title: links.title,
      description: links.description,
      markdown: links.markdown,
      contentHash: links.contentHash,
      category: links.category,
      summary: links.summary,
      promptVersion: links.promptVersion,
    })
    .from(links)
    .where(and(...conditions))
    .orderBy(links.id);

  // The topic vocabulary leash: built from the collection's existing
  // topics through the same write-time policy that stores them, so the
  // model is only ever asked to reuse clean words (see topics.ts).
  const topicRows = await db
    .select({ topics: links.topics })
    .from(links)
    .where(isNull(links.hiddenAt));
  const { vocabulary: knownTopics, winningSpellings } =
    await buildTopicVocabulary(
      topicRows.map((r) => r.topics),
      pipelineModel()
    );
  console.log(`topic vocabulary: ${knownTopics.length} known topics`);

  const rows: LinkRow[] = await (limit ? query.limit(limit) : query);
  console.log(
    `${rows.length} links to build${force ? " (forced)" : ""}` +
      `${stale ? ` · STALE (prompt < v${PROMPT_VERSION})` : ""}` +
      `${render ? " · render fallback on" : ""}`
  );

  const tally = { ok: 0, thin: 0, failed: 0, understood: 0, passages: 0, errors: 0 };
  const flips: string[] = [];
  let done = 0;

  const one = async (row: LinkRow) => {
    const before = row.category;
    try {
      const outcome = await buildLink(row, {
        force: force || render,
        render,
        knownTopics,
        winningSpellings,
      });
      // In a stale pass every flip is a line of the review table.
      if (stale && outcome.understood && before !== row.category) {
        flips.push(row.urlKey);
        console.log(`  ⟳ ${before ?? "(none)"} → ${row.category}   ${row.urlKey}`);
      }
      if (outcome.read !== "skipped") tally[outcome.read]++;
      if (outcome.understood) tally.understood++;
      tally.passages += outcome.passages;
    } catch (error) {
      tally.errors++;
      tally.failed++;
      console.warn(
        `  ✗ ${row.urlKey}: ${error instanceof Error ? error.message : error}`
      );
    }
    if (++done % 10 === 0 || done === rows.length) {
      console.log(
        `  ${done}/${rows.length} · ok ${tally.ok} · thin ${tally.thin} · ` +
          `failed ${tally.failed} · understood ${tally.understood} · ` +
          `passages ${tally.passages} · errors ${tally.errors}`
      );
    }
  };

  try {
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async (_, worker) => {
        for (let i = worker; i < rows.length; i += CONCURRENCY) await one(rows[i]);
      })
    );
  } finally {
    await closeRenderer().catch(() => undefined);
  }

  const settledRows = await settleSpellings();
  if (settledRows) console.log(`settled spellings on ${settledRows} rows`);

  console.log(`\ndone → ok ${tally.ok} · thin ${tally.thin} · failed ${tally.failed}`);
  console.log(`understood ${tally.understood} · passages ${tally.passages} · errors ${tally.errors}`);
  if (stale) console.log(`category flips: ${flips.length} (each listed above)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
