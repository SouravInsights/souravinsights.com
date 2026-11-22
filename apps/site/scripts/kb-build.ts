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

const isTTY = Boolean(process.stdout.isTTY);

/**
 * Live progress for a run. On a terminal it redraws a small block of the links
 * currently being processed; when piped it prints one plain line per stage.
 * Either way, each link gets a completion line.
 */
function createProgress(total: number, concurrency: number) {
  const header = `kb-build · ${total} to process · ${concurrency} at a time`;
  const active = new Map<
    number,
    { label: string; stage: string; detail?: string }
  >();
  let drawn = 0;

  const clear = () => {
    if (isTTY && drawn > 0) {
      process.stdout.write(`\x1b[${drawn}A\x1b[J`);
      drawn = 0;
    }
  };

  const render = () => {
    if (!isTTY) return;
    const lines = [
      header,
      ...Array.from(active.values()).map((e) =>
        `  ${e.label.padEnd(40)} ${e.stage.padEnd(10)} ${e.detail ?? ""}`.trimEnd()
      ),
    ];
    process.stdout.write(lines.join("\n") + "\n");
    drawn = lines.length;
  };

  render();

  return {
    start(id: number, label: string) {
      active.set(id, { label, stage: "queued" });
      clear();
      render();
    },
    stage(id: number, stage: string, detail?: string) {
      const entry = active.get(id);
      if (!entry) return;
      entry.stage = stage;
      entry.detail = detail;
      if (isTTY) {
        clear();
        render();
      } else {
        console.log(`  ${entry.label}  ${stage}${detail ? `  ${detail}` : ""}`);
      }
    },
    /** Print a line above the live block. */
    log(line: string) {
      clear();
      console.log(line);
      render();
    },
    finish(id: number, line: string) {
      active.delete(id);
      clear();
      console.log(line);
      render();
    },
    end() {
      clear();
    },
  };
}

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
    conditions.push(sql`(${links.markdown} is null or ${links.category} is null or ${links.summary} is null)`);
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
      source: links.source,
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
  const startedAt = Date.now();
  let done = 0;
  const progress = createProgress(rows.length, CONCURRENCY);

  const one = async (row: LinkRow) => {
    const before = row.category;
    const started = Date.now();
    progress.start(row.id, row.urlKey);

    let status: "ok" | "thin" | "failed" | "skipped" = "skipped";
    let passages = 0;
    let readDetail: string | undefined;

    try {
      const outcome = await buildLink(row, {
        force: force || render,
        render,
        knownTopics,
        winningSpellings,
        onStage: (stage, detail) => progress.stage(row.id, stage, detail),
      });
      status = outcome.read;
      passages = outcome.passages;
      readDetail = outcome.readDetail;
      // In a stale pass every flip is a line of the review table.
      if (stale && outcome.understood && before !== row.category) {
        flips.push(row.urlKey);
        progress.log(`  ⟳ ${before ?? "(none)"} → ${row.category}   ${row.urlKey}`);
      }
      if (outcome.read !== "skipped") tally[outcome.read]++;
      if (outcome.understood) tally.understood++;
      tally.passages += outcome.passages;
    } catch (error) {
      status = "failed";
      tally.errors++;
      tally.failed++;
      progress.log(
        `  ✗ ${row.urlKey}: ${error instanceof Error ? error.message : error}`
      );
    }

    const n = ++done;
    const width = String(rows.length).length;
    const mark = status === "failed" ? "✗" : status === "thin" ? "⚠" : "✓";
    const label = status === "failed" ? "failed" : status === "thin" ? "thin" : "ok";
    const reason =
      status === "failed" && readDetail ? `  ${readDetail}` : "";
    progress.finish(
      row.id,
      `${mark} ${String(n).padStart(width)}/${rows.length}  ` +
        `${row.urlKey.padEnd(40)} ${(row.category ?? "?").padEnd(12)} ` +
        `${label} · ${passages} passages · ${(
          (Date.now() - started) /
          1000
        ).toFixed(1)}s${reason}`
    );
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
  progress.end();
  if (settledRows) console.log(`settled spellings on ${settledRows} rows`);

  console.log(`\ndone → ok ${tally.ok} · thin ${tally.thin} · failed ${tally.failed}`);
  console.log(
    `understood ${tally.understood} · passages ${tally.passages} · errors ${tally.errors} · ` +
      `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
  if (stale) console.log(`category flips: ${flips.length} (each listed above)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
