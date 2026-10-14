import "./load-env";
import {
  DAILY_QUESTION_CEILING,
  DAILY_TOKEN_BUDGET,
  readDailyUsage,
} from "../src/lib/curio/budget";

/**
 * What Curio has spent today.
 *
 *   npx tsx scripts/curio-usage.ts
 *
 * The daily ceiling is the only limit that bounds a bill when traffic comes from
 * many addresses, so it is worth being able to look at rather than guess at.
 */
async function main() {
  const usage = await readDailyUsage();
  const percent = (value: number, ceiling: number) =>
    `${((value / ceiling) * 100).toFixed(1)}%`;

  console.log("curio, today");
  console.log(
    `  questions ${usage.questions}/${DAILY_QUESTION_CEILING}  (${percent(usage.questions, DAILY_QUESTION_CEILING)})`
  );
  console.log(
    `  tokens    ${usage.tokens}/${DAILY_TOKEN_BUDGET}  (${percent(usage.tokens, DAILY_TOKEN_BUDGET)})`
  );
  console.log(`  ${usage.exhausted ? "at the ceiling: further questions are refused" : "room left"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
