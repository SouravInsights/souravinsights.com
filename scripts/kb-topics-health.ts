/**
 * kb-topics-health — the five ways topics go wrong, measured on one run:
 *
 *   npx tsx scripts/kb-topics-health.ts [probe-result.json]
 *
 * Defaults to the newest dump in eval/probe-runs/. The five checks:
 * synonym clouds (one idea, many spellings) · within-link redundancy
 * (parent tagged beside its child) · umbrella words · quota-padding
 * (every link getting the max) · category words leaking into topics.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RUNS_DIR = "eval/probe-runs";
const file =
  process.argv[2] ??
  join(
    RUNS_DIR,
    readdirSync(RUNS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ f, m: statSync(join(RUNS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0].f
  );
console.log(`checking ${file}\n`);

const data = JSON.parse(readFileSync(file, "utf8")) as {
  links: { urlKey: string; truth: string; predicted: string; topics: string[] }[];
};

const links = data.links;
const freq = new Map<string, number>();
const perLink: { urlKey: string; predicted: string; topics: string[] }[] = [];

for (const l of links) {
  perLink.push({ urlKey: l.urlKey, predicted: l.predicted, topics: l.topics });
  for (const t of l.topics) freq.set(t, (freq.get(t) ?? 0) + 1);
}

const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
const singles = sorted.filter(([, n]) => n === 1);

console.log(`links: ${links.length} · distinct topics: ${freq.size} · total tags: ${Array.from(freq.values()).reduce((a, b) => a + b, 0)}`);
console.log(`singletons: ${singles.length} (${((singles.length / freq.size) * 100).toFixed(0)}%)`);

console.log("\n== TOP 40 ==");
for (const [t, n] of sorted.slice(0, 40)) console.log(`  ${String(n).padStart(3)}  ${t}`);

// Normalization clusters: same topic modulo hyphens/spaces/case
const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, "");
const clusters = new Map<string, Set<string>>();
for (const t of Array.from(freq.keys())) {
  const k = norm(t);
  if (!clusters.has(k)) clusters.set(k, new Set());
  clusters.get(k)!.add(t);
}
const dupes = Array.from(clusters.entries()).filter(([, v]) => v.size > 1);
console.log(`\n== NORMALIZATION DUPES (${dupes.length}) ==`);
for (const [, v] of dupes) console.log("  " + Array.from(v).join("  |  "));

// Odd tokens
const odd = Array.from(freq.keys()).filter((t) => /[^a-z0-9 .+#/ &-]/i.test(t) || t.length > 38 || t.split(" ").length > 4);
console.log(`\n== ODD TOKENS (${odd.length}) ==`);
for (const t of odd.slice(0, 20)) console.log("  " + JSON.stringify(t));

// Meta / umbrella words
const META = ["software development","technology","coding","resources","tool","tools","design","development","web","internet","business","productivity","marketing","writing","blogging","blog","articles","tutorial","guide","media","content","learning","education","projects","newsletter","open source"];
console.log("\n== META/UMBRELLA FREQUENCY ==");
for (const m of META) if (freq.get(m)) console.log(`  ${String(freq.get(m)).padStart(3)}  ${m}`);

// Within-link redundancy: one topic's words sit inside another's (word-level,
// same rule as the policy — substring matching would cry wolf on
// happiness/unhappiness)
console.log("\n== WITHIN-LINK REDUNDANCY (samples) ==");
let redundant = 0;
const wordsOf = (t: string) => t.split(/[\s-]+/);
for (const l of perLink) {
  const ts = l.topics;
  for (const a of ts) for (const b of ts) {
    if (a !== b && wordsOf(b).length > wordsOf(a).length && wordsOf(a).every((w) => wordsOf(b).includes(w))) {
      if (redundant < 15) console.log(`  ${l.urlKey}: “${a}” inside “${b}”`);
      redundant++;
    }
  }
}
console.log(`  ... ${redundant} total`);

// Category-word leakage
const CATWORDS = ["article","publication","people","tool","learning","inspiration","directory","newsletter","portfolio","gallery"];
let leak = 0;
for (const l of perLink) for (const t of l.topics) if (CATWORDS.includes(t)) { if (leak < 10) console.log(`  LEAK ${l.urlKey}: ${t}`); leak++; }
console.log(`\ncategory-word leaks: ${leak}`);

// Topics per link distribution
const counts = perLink.map((l) => l.topics.length);
const hist = new Map<number, number>();
for (const c of counts) hist.set(c, (hist.get(c) ?? 0) + 1);
console.log("\ntopics-per-link: " + Array.from(hist.entries()).sort().map(([k, n]) => `${k}×${n}`).join("  "));
