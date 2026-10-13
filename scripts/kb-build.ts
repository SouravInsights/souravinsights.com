import "./load-env";
import { and, inArray, isNull, ne, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { closeRenderer } from "../src/lib/kb/render";
import { buildLink, type LinkRow } from "../src/lib/kb/store";

/**
 * kb-build — the v2 pipeline over rows (docs/plans/insights-rebuild.md).
 *
 *   npx tsx scripts/kb-build.ts                      # every link needing work
 *   npx tsx scripts/kb-build.ts --limit 10           # a sample first
 *   npx tsx scripts/kb-build.ts --only blogroll.org  # one link
 *   npx tsx scripts/kb-build.ts --force              # redo even finished rows
 *   npx tsx scripts/kb-build.ts --render             # render thin pages headlessly
 *   npx tsx scripts/kb-build.ts --render --status thin,failed   # retry the weak set
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
  const only = val("only");
  const limit = val("limit") ? Number(val("limit")) : undefined;

  const statusFilter = val("status")?.split(",");

  const conditions = [isNull(links.hiddenAt), ne(links.health, "dead")];
  if (only) conditions.push(eq(links.urlKey, only));
  if (statusFilter) {
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
    })
    .from(links)
    .where(and(...conditions))
    .orderBy(links.id);

  // The topic vocabulary leash: collect once per run, hand to classify so
  // new coinages stay rare (docs/review/categorization-feedback.md, RC7).
  const topicRows = (await db.execute(sql`
    select distinct unnest(topics) as topic from links
    where hidden_at is null and topics is not null
  `)) as unknown as { rows?: { topic: string }[] } | { topic: string }[];
  const knownTopics = (Array.isArray(topicRows) ? topicRows : topicRows.rows ?? [])
    .map((r) => r.topic)
    .sort();
  console.log(`topic vocabulary: ${knownTopics.length} known topics`);

  const rows: LinkRow[] = await (limit ? query.limit(limit) : query);
  console.log(
    `${rows.length} links to build${force ? " (forced)" : ""}` +
      `${render ? " · render fallback on" : ""}`
  );
  if (!rows.length) {
    console.log("nothing to do.");
    return;
  }

  const tally = { ok: 0, thin: 0, failed: 0, understood: 0, passages: 0, errors: 0 };
  let done = 0;

  const one = async (row: LinkRow) => {
    try {
      const outcome = await buildLink(row, {
        force: force || render,
        render,
        knownTopics,
      });
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

  console.log(`\ndone → ok ${tally.ok} · thin ${tally.thin} · failed ${tally.failed}`);
  console.log(`understood ${tally.understood} · passages ${tally.passages} · errors ${tally.errors}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
