import "./load-env";
import { traceQuestion } from "../src/lib/kb/inspect";

/**
 * Ask the agent a question and watch the whole path.
 *
 *   yarn trace "why do nested rounded corners look wrong"
 *   yarn trace "travel?" --limit 3          pretend the cut was at 3 links
 *   yarn trace "travel?" --no-scores        skip the extra embeds
 *   yarn trace "travel?" --json
 *
 * (Yarn 1 passes arguments straight through — no `--` needed, unlike npm.)
 *
 * This is the thing the page cannot show you: which query the model chose, the
 * links it was actually handed, and the scores plus the ranks that were cut
 * before it ever saw them.
 *
 * It costs one real agent run (a few tenths of a cent) plus one embedding per
 * distinct search, for the scores.
 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string, s: string) =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
const bold = (s: string) => paint("1", s);
const dim = (s: string) => paint("2", s);
const red = (s: string) => paint("31", s);
const yellow = (s: string) => paint("33", s);
const cyan = (s: string) => paint("36", s);
const green = (s: string) => paint("32", s);

const num = (n: number) => n.toLocaleString("en-US");

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const takesValue = new Set(["--limit"]);
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (takesValue.has(argv[i])) {
      i++;
      continue;
    }
    if (argv[i].startsWith("--")) continue;
    positional.push(argv[i]);
  }

  const question = positional.join(" ").trim();
  if (!question) {
    console.error(
      'Usage: yarn trace "your question" [--limit N] [--no-scores] [--json]'
    );
    process.exit(1);
  }

  const result = await traceQuestion(question, {
    limit: flag("limit") ? Number(flag("limit")) : undefined,
    score: !argv.includes("--no-scores"),
  });

  if (argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n${bold("QUESTION")}  ${cyan(result.question)}`);
  console.log("═".repeat(66));

  for (const step of result.steps) {
    console.log(
      `\n${bold(`STEP ${step.stepNumber + 1}`)} ${dim(
        `finish: ${step.finishReason} · ${num(step.tokens.total)} tokens`
      )}`
    );

    if (step.toolCalls.length === 0) {
      console.log(dim("  (no tool call — the model answered)"));
    }

    for (const call of step.toolCalls) {
      console.log(`  ${green("→")} ${bold(call.name)} ${dim(JSON.stringify(call.input))}`);
    }

    for (const tr of step.toolResults) {
      if (tr.matches) {
        if (tr.matches.length === 0) {
          console.log(
            `  ${yellow("←")} ${tr.name}: ${yellow("no matches")} ${dim(
              tr.note ?? ""
            )}`
          );
          continue;
        }
        console.log(`  ${dim(`←`)} ${tr.name}: ${tr.matches.length} links handed over`);
        for (const m of tr.matches) {
          console.log(
            `      ${m.urlKey.padEnd(38)} ${dim(
              `${m.channel} · ${num(m.passageChars)} char passage`
            )}`
          );
          console.log(`      ${dim(m.title.slice(0, 70))}`);
        }
      } else if (tr.name === "fetch_link") {
        if (tr.error) {
          console.log(`  ${dim("←")} fetch_link: ${yellow(tr.error)} ${dim(tr.url ?? "")}`);
        } else {
          console.log(
            `  ${dim("←")} fetch_link: read ${cyan(tr.url ?? "")} ${dim(
              `${num(tr.textChars ?? 0)} chars`
            )}`
          );
        }
      }
    }

    if (step.text.trim()) {
      console.log(`\n${bold("  ANSWER")}\n`);
      console.log(
        step.text
          .trim()
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")
      );
    }
  }

  if (result.scored.length) {
    console.log(`\n${dim("─".repeat(66))}`);
    console.log(
      bold("SCORES") +
        dim("  (re-run wider — the ranks and scores the model never saw)")
    );

    for (const q of result.scored) {
      console.log(
        `\n  ${cyan(`"${q.query}"`)}${q.channel ? dim(`  channel=${q.channel}`) : ""}`
      );
      for (const h of q.handedOver) {
        const band = h.score >= 0.45 ? green : h.score >= 0.35 ? yellow : red;
        console.log(
          `   ${String(h.rank).padStart(2)}  ${band(h.score.toFixed(3))}  ${h.urlKey}`
        );
      }
      if (q.cut.length) {
        console.log(`      ${dim("── cut ──")}`);
        for (const c of q.cut.slice(0, 6)) {
          console.log(
            `   ${String(c.rank).padStart(2)}  ${dim(c.score.toFixed(3))}  ${dim(c.urlKey)}`
          );
        }
        if (q.cut.length > 6) {
          console.log(`      ${dim(`… and ${q.cut.length - 6} more below`)}`);
        }
      }
    }
    console.log(
      dim(
        "\n  Bands: green ≥ 0.45 (the Writing Desk's support floor) · " +
          "yellow ≥ 0.35 (today's eval cutoff) · red below that"
      )
    );
  }

  console.log(
    `\n${bold("TOTALS")}  ${result.totals.steps} steps · ` +
      `${num(result.totals.inputTokens)} in / ${num(result.totals.outputTokens)} out tokens · ` +
      `${(result.totals.ms / 1000).toFixed(1)}s\n`
  );
}

main().catch((err) => {
  console.error(red(`\n${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
