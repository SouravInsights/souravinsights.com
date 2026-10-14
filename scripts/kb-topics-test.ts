import {
  cleanTopics,
  buildTopicVocabulary,
  buildLetterCanonical,
} from "../src/lib/kb/topics";
import type { LanguageModel } from "ai";

/**
 * kb-topics-test — the topics system's regression suite, offline and free.
 *
 *   npx tsx scripts/kb-topics-test.ts    # exit 1 if any case fails
 *
 * Every case is a bug we actually saw, frozen so editing a gate can't
 * silently bring it back. New bug? Add a row. Small vocabularies skip the
 * LLM round in buildTopicVocabulary, so everything here is deterministic —
 * a dummy model stands in and is never called.
 */

const { clean } = { clean: cleanTopics };
const dummyModel = {} as LanguageModel;

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

type Case = { name: string; input: string[]; want: string[]; winners?: Record<string, string> };

const CASES: Case[] = [
  {
    name: "the worked example from topics.ts",
    input: ["Agents", "ai agents", "Design", "web design", "pricing", "react", "our full guide to modern frontend infrastructure"],
    want: ["ai agents", "web design", "react"],
  },
  {
    name: "eatonphil's filler: tautology dies, facets survive",
    input: ["databases", "distributed systems", "software development", "writing", "books"],
    want: ["databases", "distributed systems", "writing", "books"],
  },
  {
    name: "svgl's pasted sentence is not a topic",
    input: ['svgl is a directory of 670 logos: "each svg includes a link"', "logos", "icons"],
    want: ["logos", "icons"],
  },
  {
    name: "category words never become topics",
    input: ["newsletter", "learning", "react"],
    want: ["react"],
  },
  {
    name: "billing is not a subject",
    input: ["pricing", "stripe"],
    want: ["stripe"],
  },
  {
    name: "packaging words are the form, not the subject",
    input: ["tutorial", "guide", "sqlite"],
    want: ["sqlite"],
  },
  {
    name: "case and spacing normalize",
    input: ["Open Source ", " open-source"],
    want: ["open source"],
    winners: { "open-source": "open source" },
  },
  {
    name: "css is never eaten by scss",
    input: ["css", "scss"],
    want: ["css", "scss"],
  },
  {
    name: "containment keeps the specific word",
    input: ["agents", "ai agents", "cli"],
    want: ["ai agents", "cli"],
  },
  {
    name: "a chatty model is capped at the max",
    input: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    want: ["a", "b", "c", "d", "e", "f", "g"],
  },
  {
    name: "typo fragments are not topics",
    input: [":geolocation", "api"],
    want: ["api"],
  },
];

async function main() {
  for (const c of CASES) {
    check(c.name, clean(c.input, c.winners ?? {}), c.want);
  }

  // The vocabulary build's deterministic half (letters round; the mini
  // collection skips the LLM round by design).
  const rows: string[][] = [
    ["open source"], ["open source"], ["open-source"],
    ["front-end"], ["frontend"], ["agents"], ["agents"],
  ];
  const { vocabulary, winningSpellings } = await buildTopicVocabulary(rows, dummyModel);
  check("letters pick the winning spelling", winningSpellings, {
    "open-source": "open source",
    "front-end": "frontend",
  });
  check("counts merge across variants", vocabulary, [
    "open source (3)",
    "agents (2)",
    "frontend (2)",
  ]);

  // The settle pass catches what one RUN splits across two pages:
  // "data-visualization" here, "data visualization" there — letter-proven,
  // no model needed.
  check(
    "settle pass merges letter-proven variants",
    buildLetterCanonical([["data-visualization"], ["data visualization", "research"], ["data visualization"]]),
    { "data-visualization": "data visualization" }
  );

  console.log(failures ? `\n${failures} FAILURES` : `\nall ${CASES.length + 2} cases pass`);
  if (failures) process.exit(1);
}

main();
