import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import { links, linkChunks } from "../src/db/schema";
import { EMBEDDING_MODEL_ID, CHAT_MODEL_ID } from "../src/lib/kb/model";
import { MAX_TOKENS } from "../src/lib/kb/chunk";

/**
 * Snapshot the state of the knowledge base into a committed report, so the
 * build's outcome — how many links were read, what came back thin or failed,
 * how many passages exist — survives the console and is readable by humans and
 * agents later.
 *
 * Usage:
 *   npx tsx scripts/kb-report.ts           # print to stdout
 *   npx tsx scripts/kb-report.ts --write    # (re)write docs/kb/build-report.md
 */

const words = (s: string | null) =>
  (s ?? "").trim().split(/\s+/).filter(Boolean).length;

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "docs", "kb", "build-report.md");

const STATUSES = ["ok", "thin", "failed", "skipped", "pending"];

async function main() {
  const one = async (query: Promise<{ n: number }[]>) => Number((await query)[0]?.n ?? 0);

  const total = await one(db.select({ n: sql<number>`count(*)::int` }).from(links));
  const hidden = await one(
    db.select({ n: sql<number>`count(*)::int` }).from(links).where(sql`hidden_at is not null`)
  );
  const passages = await one(
    db.select({ n: sql<number>`count(*)::int` }).from(linkChunks)
  );

  const counts = await db
    .select({ status: links.extractStatus, n: sql<number>`count(*)::int` })
    .from(links)
    .groupBy(links.extractStatus);
  const byStatus = new Map(counts.map((c) => [c.status, Number(c.n)]));

  const problem = await db
    .select({
      url: links.url,
      channel: links.channel,
      status: links.extractStatus,
      raw: links.rawText,
    })
    .from(links)
    .where(inArray(links.extractStatus, ["thin", "failed"]))
    .orderBy(links.extractStatus, links.url);

  // Per channel, how much of it search can actually reach. A channel with
  // links but no passages is invisible to the agent — worth seeing at a glance.
  const coverage = (await db.execute(sql`
    select l.channel,
           count(distinct l.id)::int as links,
           count(c.id)::int as passages,
           count(distinct l.id) filter (where c.id is null)::int as missing
    from links l
    left join link_chunks c on c.link_id = l.id
    where l.hidden_at is null
    group by l.channel
    order by links desc
  `)) as unknown as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
  const coverageRows = Array.isArray(coverage) ? coverage : coverage.rows ?? [];

  const L: string[] = [];
  L.push("# KB build report", "");
  L.push(
    `_Generated ${new Date().toISOString()}. Regenerate: \`npx tsx scripts/kb-report.ts --write\`._`,
    ""
  );
  L.push(
    `Embedding model \`${EMBEDDING_MODEL_ID}\` · chat model \`${CHAT_MODEL_ID}\` · chunk target ${MAX_TOKENS} tokens.`,
    ""
  );
  L.push("## Links", "", "| Status | Count |", "| :--- | ---: |");
  for (const s of STATUSES) {
    const n = byStatus.get(s) ?? 0;
    if (n) L.push(`| ${s} | ${n} |`);
  }
  L.push("");
  L.push(
    `**Total links:** ${total} (${hidden} hidden). **Passages stored:** ${passages}.`,
    ""
  );
  L.push("## Coverage per channel", "");
  L.push(
    "`missing` = links search cannot reach at all (no passage was stored).",
    "",
    "| Channel | Links | Passages | Missing |",
    "| :--- | ---: | ---: | ---: |"
  );
  for (const row of coverageRows) {
    L.push(
      `| ${row.channel} | ${row.links} | ${row.passages} | ${row.missing} |`
    );
  }
  L.push("");
  L.push("## Thin / failed (need attention)", "");
  L.push(
    "`thin` = under 200 words (a short landing page, a paywall, or a JS shell).",
    "`failed` = no text extracted at all.",
    "",
    "| Status | Words | Channel | URL |",
    "| :--- | ---: | :--- | :--- |"
  );
  for (const r of problem) {
    L.push(`| ${r.status} | ${words(r.raw)} | ${r.channel} | ${r.url} |`);
  }
  L.push("", `${problem.length} thin/failed links.`, "");

  const report = L.join("\n");
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, report);
    console.log(`wrote ${OUT}`);
  } else {
    console.log(report);
  }
  console.log(
    `\ntotals: ${total} links · ${passages} passages · ${problem.length} thin/failed`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
