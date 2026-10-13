import "./load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isNull, isNotNull, and, ne, sql } from "drizzle-orm";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import { modelById } from "../src/lib/kb/model";
import { resolveCategory } from "../src/lib/kb/categories";
import { PROMPT_VERSION } from "../src/lib/kb/prompts";
import { classifyPage } from "../src/lib/kb/understand";

/**
 * kb-classify-probe — score the taxonomy + prompt + model against the owner's
 * frozen review, without touching anything.
 *
 *   npx tsx scripts/kb-classify-probe.ts                       # openai/gpt-4o-mini
 *   npx tsx scripts/kb-classify-probe.ts --model anthropic/claude-haiku-4.5
 *   npx tsx scripts/kb-classify-probe.ts --golden-only          # scored set only
 *   npx tsx scripts/kb-classify-probe.ts --limit 20             # smoke run
 *
 * Reads STORED markdown from the links table — zero refetches, zero writes,
 * no describe, no embed. Truth = golden corrections where they exist, else
 * the row's current category mapped through the v1→v2 rename (the owner
 * reviewed every link; unflagged rows are presumed right and reported
 * separately as the holdout).
 *
 * Plan: docs/review/categorization-feedback.md §8. Bar: >=95% golden,
 * >=90% holdout before any reclassify pass runs.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = join(HERE, "..", "eval", "category-golden.json");

const flag = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1] ?? true;
};

const CONCURRENCY = 8;

type GoldenEntry = {
  urlKey: string;
  expected: string;
  today: string | null;
  note?: string;
  noMarkdown?: boolean;
};

async function main() {
  const modelId = (flag("model") as string) ?? "openai/gpt-4o-mini";
  const goldenOnly = Boolean(flag("golden-only"));
  const limit = flag("limit") ? Number(flag("limit")) : undefined;

  const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as {
    corrections: GoldenEntry[];
  };
  const expectedByKey = new Map(golden.corrections.map((c) => [c.urlKey, c]));

  const rows = await db
    .select({
      id: links.id,
      urlKey: links.urlKey,
      title: links.title,
      description: links.description,
      markdown: links.markdown,
      category: links.category,
      wordCount: links.wordCount,
    })
    .from(links)
    .where(
      and(
        isNull(links.hiddenAt),
        ne(links.health, "dead"),
        isNotNull(links.markdown)
      )
    )
    .orderBy(links.id);

  const topicRows = (await db.execute(sql`
    select distinct unnest(topics) as topic from links
    where hidden_at is null and topics is not null
  `)) as unknown as { rows?: { topic: string }[] } | { topic: string }[];
  const knownTopics = (Array.isArray(topicRows) ? topicRows : topicRows.rows ?? [])
    .map((r) => r.topic)
    .sort();

  // scored rows = golden ∪ holdout, each with its truth source recorded.
  const seen = new Set<string>();
  const scored: {
    urlKey: string;
    truth: string;
    source: "golden" | "holdout";
    title: string;
    description: string;
    markdown: string;
    words: number;
  }[] = [];

  for (const row of rows) {
    const g = expectedByKey.get(row.urlKey);
    const truth = g?.expected ?? resolveCategory(row.category) ?? null;
    if (!truth) continue;
    seen.add(row.urlKey);
    scored.push({
      urlKey: row.urlKey,
      truth,
      source: g ? "golden" : "holdout",
      title: row.title,
      description: row.description,
      markdown: row.markdown!,
      words: row.wordCount ?? 0,
    });
    if (goldenOnly && !g) scored.pop();
  }

  const missing = golden.corrections.filter((c) => !seen.has(c.urlKey));
  const work = limit ? scored.slice(0, limit) : scored;

  console.log(
    `probe · model ${modelId} · ${work.length} links ` +
      `(${work.filter((w) => w.source === "golden").length} golden, ` +
      `${work.filter((w) => w.source === "holdout").length} holdout) · ` +
      `vocabulary ${knownTopics.length} topics`
  );
  if (missing.length) {
    console.log(`skipped (no markdown / not in collection): ${missing.length}`);
    for (const m of missing) console.log(`  · ${m.urlKey} (expected ${m.expected})`);
  }

  const model = modelById(modelId);
  const results: {
    urlKey: string;
    source: "golden" | "holdout";
    truth: string;
    predicted: string;
    confidence: string;
    topics: string[];
    ok: boolean;
    boundary: boolean;
  }[] = [];
  let done = 0;
  let failed = 0;

  const one = async (row: (typeof scored)[number]) => {
    try {
      const object = await classifyPage(model, {
        url: row.urlKey,
        title: row.title,
        description: row.description,
        site: "",
        markdown: row.markdown,
        knownTopics,
      });
      // The production rule: low confidence files the link for review.
      const predicted =
        object.confidence === "low" ? "other" : object.category;
      results.push({
        urlKey: row.urlKey,
        source: row.source,
        truth: row.truth,
        predicted,
        confidence: object.confidence,
        topics: object.topics.map((t) => t.toLowerCase().trim()).slice(0, 7),
        ok: predicted === row.truth,
        boundary: false,
      });
    } catch (error) {
      failed++;
      results.push({
        urlKey: row.urlKey,
        source: row.source,
        truth: row.truth,
        predicted: `ERROR: ${error instanceof Error ? error.message.slice(0, 80) : error}`,
        confidence: "-",
        topics: [],
        ok: false,
        boundary: false,
      });
    }
    if (++done % 25 === 0 || done === work.length) {
      const hits = results.filter((r) => r.ok).length;
      console.log(
        `  ${done}/${work.length} · agreement ${((hits / results.length) * 100).toFixed(1)}%`
      );
    }
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async (_, worker) => {
      for (let i = worker; i < work.length; i += CONCURRENCY) await one(work[i]);
    })
  );

  const by = (s: "golden" | "holdout") =>
    results.filter((r) => r.source === s && !r.boundary);
  const pct = (rs: typeof results) =>
    rs.length ? ((rs.filter((r) => r.ok).length / rs.length) * 100).toFixed(1) : "—";

  console.log("\n== RESULT ==");
  console.log(
    `golden   ${pct(by("golden"))}%  (${by("golden").filter((r) => r.ok).length}/${by("golden").length})`
  );
  console.log(
    `holdout  ${pct(by("holdout"))}%  (${by("holdout").filter((r) => r.ok).length}/${by("holdout").length})`
  );
  console.log(
    `overall  ${pct(results)}%  (${results.filter((r) => r.ok).length}/${results.length}) · ${failed} errors`
  );

  const conf = new Map<string, number>();
  for (const r of results) conf.set(r.confidence, (conf.get(r.confidence) ?? 0) + 1);
  console.log(
    `confidence: ${Array.from(conf.entries()).map(([k, n]) => `${k} ${n}`).join(" · ")}`
  );

  const misses = results.filter((r) => !r.ok && !r.boundary);
  if (misses.length) {
    console.log(`\n== MISMATCHES (${misses.length}) ==`);
    for (const m of misses.sort((a, b) => a.source.localeCompare(b.source))) {
      console.log(
        `  [${m.source}] ${m.urlKey}\n      expected ${m.truth} · predicted ${m.predicted} (${m.confidence})`
      );
    }
  }

  // Every run writes its FULL per-link result next to the log — category,
  // confidence and topics for every scored link, reviewable without reruns.
  // (Summaries exist only after a describe/reclassify pass, not here.)
  const dumpPath = join(
    HERE,
    "..",
    "eval",
    "probe-runs",
    `${modelId.replace(/[/:]/g, "-")}-v${PROMPT_VERSION}.json`
  );
  writeFileSync(
    dumpPath,
    JSON.stringify(
      {
        model: modelId,
        ranAt: new Date().toISOString(),
        agreement: {
          golden: pct(by("golden")),
          holdout: pct(by("holdout")),
        },
        links: results.map((r) => ({
          urlKey: r.urlKey,
          source: r.source,
          truth: r.truth,
          predicted: r.predicted,
          confidence: r.confidence,
          topics: r.topics,
        })),
      },
      null,
      2
    )
  );
  console.log(`\nfull result: ${dumpPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
