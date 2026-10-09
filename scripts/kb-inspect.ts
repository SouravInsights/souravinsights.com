import "./load-env";
import {
  inspectLink,
  kbOverview,
  LinkNotFoundError,
  HEAVY_CHUNKS,
} from "../src/lib/kb/inspect";

/**
 * Look at what we stored for a link.
 *
 *   yarn inspect                      the whole index at a glance
 *   yarn inspect <url-or-part>        one link: status, sizes, first 5 passages
 *   yarn inspect <url-or-part> --all       every passage
 *   yarn inspect <url-or-part> --chunks 3
 *   yarn inspect <url-or-part> --grep "kava"   only passages containing it
 *   yarn inspect <url-or-part> --json
 *
 * The target can be a `url_key`, a whole pasted URL, or any fragment of a key or
 * title — `time.fyi`, `https://www.time.fyi/` and `time` all reach the same row.
 * If it's ambiguous you get the candidates back instead of a guess.
 *
 * (Yarn 1 passes arguments straight through — no `--` needed, unlike npm.)
 *
 * The point is the warnings: a link that owns a tenth of the index, a page whose
 * text is a directory, a link that was never indexed at all. Those are the reads
 * that keep a knowledge base honest.
 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string, s: string) =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
const bold = (s: string) => paint("1", s);
const dim = (s: string) => paint("2", s);
const red = (s: string) => paint("31", s);
const yellow = (s: string) => paint("33", s);
const cyan = (s: string) => paint("36", s);

const num = (n: number) => n.toLocaleString("en-US");
const rule = (label: string) => {
  const line = "─".repeat(Math.max(4, 62 - label.length));
  console.log(`\n${bold(label)} ${dim(line)}`);
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const takesValue = new Set(["--chunks", "--grep"]);

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (takesValue.has(a)) {
      i++; // skip its value
      continue;
    }
    if (a.startsWith("--")) continue;
    positional.push(a);
  }
  const urlKey = positional[0];

  if (!urlKey) {
    const { totals, channels, heaviest, unindexed } = await kbOverview();

    console.log(bold("\nTHE INDEX"));
    console.log(
      `  ${num(totals.links)} links (${num(totals.visible)} visible) · ` +
        `${num(totals.passages)} passages · ${num(totals.not_indexed)} visible links not indexed`
    );

    rule("BY CHANNEL");
    console.log(
      `  ${"channel".padEnd(16)} ${"links".padStart(6)} ${"passages".padStart(9)}  median`
    );
    for (const c of channels) {
      console.log(
        `  ${c.channel.padEnd(16)} ${num(c.links).padStart(6)} ${num(
          c.passages
        ).padStart(9)}  ${num(c.median_tokens)} tok`
      );
    }

    rule("HEAVIEST LINKS");
    for (const h of heaviest) {
      const heavy = h.passages > HEAVY_CHUNKS;
      const line =
        `  ${num(h.passages).padStart(6)}  ${h.pctOfIndex.toFixed(1).padStart(5)}%  ` +
        `${h.urlKey}  ${dim(`(${h.channel}, ${h.extractStatus}, ${num(h.rawChars)} chars)`)}`;
      console.log(heavy ? red(line) : line);
    }
    console.log(
      dim(
        `\n  A link above ${HEAVY_CHUNKS} passages owns enough of the index to distort it.` +
          `\n  Inspect one:  yarn inspect <urlKey>`
      )
    );

    if (unindexed.length) {
      rule("NOT INDEXED (invisible to search)");
      for (const u of unindexed) {
        console.log(`  ${u.urlKey}  ${dim(`(${u.channel}, ${u.extractStatus})`)}`);
      }
    }
    return;
  }

  const limit = flag("all") !== undefined ? 100_000 : Number(flag("chunks") ?? 5);
  const result = await inspectLink(urlKey, {
    limit,
    grep: flag("grep"),
  });

  if (argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const l = result.link;
  const s = result.stats;

  console.log(`\n${bold("LINK")}  ${cyan(l.urlKey)} ${dim(`(id ${l.id})`)}`);
  console.log(`  ${"title".padEnd(11)} ${l.title || dim("(none)")}`);
  console.log(`  ${"url".padEnd(11)} ${l.url}`);
  console.log(
    `  ${"channel".padEnd(11)} ${l.channel}   ${dim("status")} ${l.extractStatus}   ${dim("health")} ${l.health}`
  );
  console.log(
    `  ${"added".padEnd(11)} ${l.addedAt.slice(0, 10)}   ${dim("last read")} ${
      l.extractedAt ? l.extractedAt.slice(0, 19).replace("T", " ") : dim("never")
    }`
  );
  console.log(`  ${"raw text".padEnd(11)} ${num(l.rawChars)} chars`);
  console.log(
    `  ${"passages".padEnd(11)} ${num(s.passages)}` +
      (s.indexPassages
        ? `  ${dim(`(${s.pctOfIndex.toFixed(1)}% of the index's ${num(s.indexPassages)})`)}`
        : "") +
      `   ${dim(`tokens ${num(s.minTokens)}–${num(s.maxTokens)}, median ${num(s.medianTokens)}`)}`
  );
  console.log(
    `  ${"embedded as".padEnd(11)} ${dim(`${result.embeddingHeader}<passage>  — reconstructed from the current title`)}`
  );

  if (!l.description) {
    console.log(`  ${dim("no description stored")}`);
  }

  for (const w of result.warnings) {
    const line = `  ${w.level === "warn" ? "!" : "i"} ${w.message}`;
    console.log(w.level === "warn" ? red(line) : yellow(line));
  }

  if (s.passages === 0) {
    console.log(dim("\n  Nothing stored — nothing to show."));
    return;
  }

  const shown = result.passages.length;
  console.log(
    `\n${bold("PASSAGES")} ${dim(
      `${shown} of ${num(s.passages)}` +
        (result.matched !== s.passages ? ` (${num(result.matched)} match the filter)` : "") +
        (shown < s.passages ? "  — --all for every one, --grep TEXT to filter" : "")
    )}`
  );

  for (const p of result.passages) {
    console.log(
      `\n${dim("┌")} ${cyan(`[${p.index}]`)} ${dim(
        `${num(p.tokens)} tokens · ${num(p.chars)} chars`
      )}`
    );
    console.log(p.content.trimEnd());
  }
}

main().catch((err) => {
  if (err instanceof LinkNotFoundError) {
    console.error(red(`\n${err.message}`));
    if (err.candidates.length) {
      console.error(dim("\n  Candidates — re-run with one of these keys:\n"));
      for (const c of err.candidates.slice(0, 12)) {
        console.error(
          `    ${cyan(c.urlKey)}  ${dim(`${c.channel} · ${num(c.passages)} passages`)}`
        );
        if (c.title) console.error(`      ${dim(c.title.slice(0, 68))}`);
      }
      if (err.candidates.length > 12) {
        console.error(dim(`\n    … and ${err.candidates.length - 12} more`));
      }
    }
    process.exit(1);
  }
  console.error(red(`\n${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
