import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { search } from "../src/lib/kb/search";
import { getLinks } from "../src/lib/links/queries";

/**
 * Measure retrieval quality (spec step 3; docs/kb/04-evals.md).
 *
 * Two checks, both at the LINK level (a citation is a link, not a passage):
 *   1. recall@5 + MRR@10 on answerable queries — versus a keyword baseline.
 *      If semantic search can't beat dumb keyword matching, it isn't earning
 *      its complexity.
 *   2. unanswerable queries must fall below a similarity cutoff, so we answer
 *      "not covered" instead of returning the least-bad link.
 *
 * Usage:
 *   npx tsx scripts/kb-eval.ts          # scoreboard + gates
 *   npx tsx scripts/kb-eval.ts --json    # machine-readable
 */

interface Golden {
  answerable: { query: string; expect: string[] }[];
  unanswerable: { query: string }[];
}

const K = 5; // recall@K
const RANK_K = 10; // MRR@K
const CUTOFF = Number(process.env.KB_CUTOFF ?? 0.35);

const HERE = dirname(fileURLToPath(import.meta.url));
const golden: Golden = JSON.parse(
  readFileSync(join(HERE, "..", "eval", "kb-golden.json"), "utf8")
);

type Link = { urlKey: string; title: string; url: string; description: string };

/** Of the expected links, how many appear in the top K? */
function recallAtK(retrieved: string[], expect: string[]): number {
  if (!expect.length) return 0;
  const top = new Set(retrieved.slice(0, K));
  return expect.filter((e) => top.has(e)).length / expect.length;
}

/** 1 / rank of the first correct link (0 if none in the top RANK_K). */
function reciprocalRank(retrieved: string[], expect: string[]): number {
  for (let i = 0; i < Math.min(retrieved.length, RANK_K); i++) {
    if (expect.includes(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

/** The baseline the KB must beat: keyword matching over title/desc/url. */
function keywordRank(query: string, links: Link[]): string[] {
  const tokens = query.toLowerCase().split(/\W+/).filter((t) => t.length >= 3);
  if (!tokens.length) return [];
  return links
    .filter((l) => {
      const hay = `${l.title} ${l.description} ${l.url}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    })
    .slice(0, RANK_K)
    .map((l) => l.urlKey);
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

async function main() {
  const asJson = process.argv.includes("--json");
  const links = (await getLinks()) as Link[];
  const visible = new Set(links.map((l) => l.urlKey));

  const semR5: number[] = [];
  const semRR: number[] = [];
  const baseR5: number[] = [];
  const baseRR: number[] = [];
  const rows: string[] = [];

  for (const { query, expect } of golden.answerable) {
    // A golden link can later be hidden or die — warn, don't silently fail.
    const stale = expect.filter((e) => !visible.has(e));
    if (stale.length) {
      console.warn(`⚠ stale expectation, not in the visible set: ${stale.join(", ")}`);
    }

    const hits = await search(query, { limit: RANK_K });
    const retrieved = hits.map((h) => h.urlKey);
    const base = keywordRank(query, links);

    const r5 = recallAtK(retrieved, expect);
    const rr = reciprocalRank(retrieved, expect);
    const br5 = recallAtK(base, expect);
    const brr = reciprocalRank(base, expect);

    semR5.push(r5);
    semRR.push(rr);
    baseR5.push(br5);
    baseRR.push(brr);
    rows.push(
      `${r5.toFixed(2)}   ${br5.toFixed(2)}    "${query}"  → ${retrieved[0] ?? "(none)"}`
    );
  }

  // Unanswerable: the top similarity should sit below the cutoff.
  const noAnswer: { query: string; score: number; ok: boolean }[] = [];
  for (const { query } of golden.unanswerable) {
    const [top] = await search(query, { limit: 1 });
    const score = top ? top.score : 0;
    noAnswer.push({ query, score, ok: score < CUTOFF });
  }

  const semRecall = mean(semR5);
  const semMRR = mean(semRR);
  const baseRecall = mean(baseR5);
  const baseMRR = mean(baseRR);

  const recallPass = semRecall >= 0.8;
  const beatsPass = semRecall > baseRecall;
  const cutoffPass = noAnswer.every((n) => n.ok);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          semantic: { recallAt5: semRecall, mrrAt10: semMRR },
          keyword: { recallAt5: baseRecall, mrrAt10: baseMRR },
          noAnswer,
          gates: { recallPass, beatsPass, cutoffPass, cutoff: CUTOFF },
        },
        null,
        2
      )
    );
    return;
  }

  console.log("\nRecall@5  Keyword  Query");
  console.log("--------  -------  -----");
  for (const r of rows) console.log(r);

  console.log("\n— Retrieval —");
  console.log(`  semantic   recall@${K} ${semRecall.toFixed(3)}   MRR@${RANK_K} ${semMRR.toFixed(3)}`);
  console.log(`  keyword    recall@${K} ${baseRecall.toFixed(3)}   MRR@${RANK_K} ${baseMRR.toFixed(3)}`);

  console.log("\n— Unanswerable (top similarity must be < cutoff) —");
  for (const n of noAnswer) {
    console.log(`  ${n.ok ? " ok " : " BAD"}  ${n.score.toFixed(3)}  "${n.query}"`);
  }

  const allPass = recallPass && beatsPass && cutoffPass;
  console.log(
    `\n${allPass ? "PASS" : "FAIL"}  ` +
      `recall@5 ≥ 0.80: ${recallPass}   beats keyword: ${beatsPass}   no-answer cutoff: ${cutoffPass}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

