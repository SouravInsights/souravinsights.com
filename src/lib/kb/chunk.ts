import { getEncoding } from "js-tiktoken";

/**
 * chunk — split markdown into embedding-sized passages.
 *
 * Markdown-aware where v1 was not: headings define the sections (a passage
 * knows which one it came from), and fenced code blocks are their own unit
 * kind — code never embeds mixed into prose. Paragraph boundaries and the
 * ~15% overlap rule are unchanged from v1.
 */

export const MAX_TOKENS = 500;
/** ~15% of a passage is repeated at the start of the next, in tokens. */
const OVERLAP_TOKENS = 75;
/** A single code unit may exceed the prose budget; walls get windowed. */
const CODE_MAX_TOKENS = 900;

const encoder = getEncoding("cl100k_base");
const tokensOf = (text: string) => encoder.encode(text).length;

export interface ChunkUnit {
  /** 0-based position within the link. */
  index: number;
  /** The passage text — stored and later shown as a citation. */
  content: string;
  unitType: "prose" | "code";
  /** ATX heading path the passage sits under, e.g. "Exit animations › Timing". */
  heading: string | null;
  tokenCount: number;
  /** What actually gets embedded: title + heading path in front of the text. */
  embeddingText: string;
}

interface Block {
  kind: "prose" | "code";
  text: string;
  heading: string | null;
}

/** Walk the markdown into prose paragraphs and code fences, tracking headings. */
function blocksOf(markdown: string): Block[] {
  const blocks: Block[] = [];
  const headingStack = new Map<number, string>();
  let prose: string[] = [];
  let code: string[] | null = null;

  const headingLevels = () => {
    const levels: number[] = [];
    headingStack.forEach((_, level) => levels.push(level));
    return levels.sort((a, b) => a - b);
  };

  const currentHeading = () => {
    const levels = headingLevels();
    return levels.length
      ? levels.map((l) => headingStack.get(l)).join(" › ")
      : null;
  };

  const flushProse = () => {
    const text = prose.join("\n\n").trim();
    if (text) blocks.push({ kind: "prose", text, heading: currentHeading() });
    prose = [];
  };

  for (const line of markdown.split("\n")) {
    if (code) {
      code.push(line);
      if (/^```/.test(line)) {
        blocks.push({
          kind: "code",
          text: code.join("\n"),
          heading: currentHeading(),
        });
        code = null;
      }
      continue;
    }

    if (/^```/.test(line)) {
      flushProse();
      code = [line];
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)/.exec(line);
    if (headingMatch) {
      flushProse();
      const level = headingMatch[1].length;
      headingStack.set(level, headingMatch[2].trim());
      for (const l of headingLevels()) if (l > level) headingStack.delete(l);
      continue;
    }

    if (!line.trim()) {
      flushProse();
      continue;
    }
    prose.push(line);
  }
  if (code) blocks.push({ kind: "code", text: code.join("\n"), heading: currentHeading() });
  flushProse();
  return blocks;
}

/** Split a code wall into line windows with a small overlap. */
function windowCode(text: string): string[] {
  if (tokensOf(text) <= CODE_MAX_TOKENS) return [text];

  const lines = text.split("\n");
  const windows: string[] = [];
  let buffer: string[] = [];
  let tokens = 0;

  for (const line of lines) {
    if (tokens + tokensOf(line) > CODE_MAX_TOKENS) {
      windows.push(buffer.join("\n"));
      // Keep the last ~50 tokens as the next window's first lines.
      const overlap: string[] = [];
      let overlapTokens = 0;
      for (let i = buffer.length - 1; i >= 0 && overlapTokens < 50; i--) {
        overlap.unshift(buffer[i]);
        overlapTokens += tokensOf(buffer[i]);
      }
      buffer = overlap;
      tokens = overlapTokens;
    }
    buffer.push(line);
    tokens += tokensOf(line);
  }
  if (buffer.length) windows.push(buffer.join("\n"));
  return windows;
}

export function chunkMarkdown(
  markdown: string,
  opts: { title: string }
): ChunkUnit[] {
  const prefix = (heading: string | null) =>
    heading ? `${opts.title} › ${heading}` : opts.title;

  const units: Omit<ChunkUnit, "index">[] = [];
  let carry: Block[] = [];
  let carryTokens = 0;
  let run: Block[] = [];
  let runTokens = 0;

  const pushProse = (blocks: Block[]) => {
    const text = blocks
      .map((b) => b.text)
      .join("\n\n")
      .trim();
    if (!text) return;
    const heading = blocks[blocks.length - 1].heading;
    units.push({
      content: text,
      unitType: "prose",
      heading,
      tokenCount: tokensOf(text),
      embeddingText: `${prefix(heading)}: ${text}`,
    });
  };

  const flushRun = () => {
    if (!run.length) return;
    pushProse(run);
    // Overlap: the last paragraphs, up to the budget, open the next chunk.
    carry = [];
    carryTokens = 0;
    for (let i = run.length - 1; i >= 0 && carryTokens < OVERLAP_TOKENS; i--) {
      carry.unshift(run[i]);
      carryTokens += tokensOf(run[i].text);
    }
    run = [];
    runTokens = 0;
  };

  for (const block of blocksOf(markdown)) {
    if (block.kind === "code") {
      flushRun();
      carry = [];
      carryTokens = 0;
      for (const window of windowCode(block.text)) {
        units.push({
          content: window,
          unitType: "code",
          heading: block.heading,
          tokenCount: tokensOf(window),
          embeddingText: `${prefix(block.heading)}: ${window}`,
        });
      }
      continue;
    }

    const blockTokens = tokensOf(block.text);
    if (runTokens + blockTokens > MAX_TOKENS && run.length) flushRun();

    if (carry.length) {
      run = [...carry];
      runTokens = carryTokens;
      carry = [];
      carryTokens = 0;
    }

    run.push(block);
    runTokens += blockTokens;
  }
  flushRun();

  return units.map((unit, index) => ({ ...unit, index }));
}
