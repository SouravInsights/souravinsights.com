import "./load-env";
import { generateText, stepCountIs } from "ai";
import { chatModel } from "../src/lib/kb/model";
import { agentTools, MAX_STEPS } from "../src/lib/kb/agent";
import { SYSTEM_PROMPT } from "../src/lib/kb/prompt";

/**
 * kb-ask — put one question through the agent the visitor actually talks to:
 * the same system prompt, the same tools, the same model, the same step cap.
 *
 *   npx tsx scripts/kb-ask.ts "which sandboxes exist for running agents"
 *   npx tsx scripts/kb-ask.ts --model openai/gpt-4o-mini "…"
 *
 * It prints the answer, the tool calls it made, and the links it cited, so an
 * answer can be judged on substance rather than on feeling. Answers are
 * untrusted page text plus model prose; read them like a visitor would.
 */

const flag = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

async function main() {
  const modelId = flag("model");
  const question = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--") && arg !== modelId)
    .join(" ")
    .trim();

  if (!question) {
    console.log('usage: npx tsx scripts/kb-ask.ts "your question" [--model id]');
    process.exit(1);
  }

  const model = modelId
    ? (await import("../src/lib/kb/model")).modelById(modelId)
    : chatModel();

  const started = Date.now();
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    tools: agentTools(),
    stopWhen: stepCountIs(MAX_STEPS),
    prompt: question,
  });

  console.log(`\nQ: ${question}\n`);
  console.log(result.text.trim());

  const calls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => ({
      name: call.toolName,
      input: JSON.stringify(call.input).slice(0, 120),
    }))
  );
  console.log(`\n— ${result.steps.length} steps · ${calls.length} tool calls · ${((Date.now() - started) / 1000).toFixed(1)}s`);
  for (const call of calls) console.log(`  ${call.name} ${call.input}`);

  const words = result.text.trim().split(/\s+/).filter(Boolean).length;
  console.log(`  answer length: ${words} words · ${result.usage.outputTokens ?? "?"} output tokens`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
