import { getEncoding } from "js-tiktoken";

/**
 * Split a page's text into passages ("chunks") for embedding.
 *
 * Why chunk at all: a 4,000-word essay squashed into one vector averages out to
 * a blur — it's *about* everything and matches nothing. One passage per idea
 * keeps each vector sharp, and lets a citation point at the exact passage.
 *
 * Two rules that matter:
 * - Split on paragraph boundaries, so a chunk is never half a headline and half
 *   a sentence (that embeds as noise).
 * - Overlap neighbours by ~15%, so a sentence that lands on a boundary still
 *   appears whole in one of them.
 */

/** Target size of a passage, in tokens. */
export const MAX_TOKENS = 500;
/** ~15% of a passage is repeated at the start of the next, in tokens. */
const OVERLAP_TOKENS = 75;

export interface Chunk {
  /** 0-based position within the link. */
  index: number;
  /** The passage text — stored and later shown as a citation. */
  content: string;
  /**
   * The text actually embedded: `"{title} — {channel}: {content}"`. A bare
   * passage like "it also handles soft deletes well" is unfindable; with a
   * title/channel header in front of it, it becomes searchable context.
   */
  embeddingText: string;
  tokenCount: number;
}

// cl100k_base is the tokenizer behind text-embedding-3-small, so our counts
// match what the embedding model will actually see.
const encoder = getEncoding("cl100k_base");
const tokensOf = (text: string) => encoder.encode(text).length;

/** Split a too-long paragraph into sentence windows, then word windows. */
function splitLongParagraph(paragraph: string): string[] {
  const pieces: string[] = [];
  const sentences = paragraph.split(/(?<=[.!?])\s+/);

  let buffer: string[] = [];
  let bufferTokens = 0;
  const flush = () => {
    if (buffer.length) pieces.push(buffer.join(" "));
    buffer = [];
    bufferTokens = 0;
  };

  for (const sentence of sentences) {
    const t = tokensOf(sentence);
    if (t > MAX_TOKENS) {
      flush();
      // A single monster sentence — split on words.
      let wordBuffer: string[] = [];
      let wordTokens = 0;
      for (const word of sentence.split(/\s+/)) {
        const wt = tokensOf(word) + 1;
        if (wordTokens + wt > MAX_TOKENS && wordBuffer.length) {
          pieces.push(wordBuffer.join(" "));
          wordBuffer = [];
          wordTokens = 0;
        }
        wordBuffer.push(word);
        wordTokens += wt;
      }
      if (wordBuffer.length) pieces.push(wordBuffer.join(" "));
      continue;
    }
    if (bufferTokens + t > MAX_TOKENS && buffer.length) flush();
    buffer.push(sentence);
    bufferTokens += t;
  }
  flush();
  return pieces;
}

/** The trailing paragraphs that add up to roughly `budget` tokens. */
function overlapTail(paragraphs: string[], budget: number): string[] {
  const tail: string[] = [];
  let total = 0;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const t = tokensOf(paragraphs[i]);
    if (total + t > budget) break;
    tail.unshift(paragraphs[i]);
    total += t;
  }
  return tail;
}

export function chunkText(
  text: string,
  meta: { title: string; channel: string }
): Chunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length) pieces.push(current.join("\n\n"));
    current = [];
    currentTokens = 0;
  };

  for (const paragraph of paragraphs) {
    const t = tokensOf(paragraph);
    if (t > MAX_TOKENS) {
      flush();
      for (const piece of splitLongParagraph(paragraph)) pieces.push(piece);
      continue;
    }
    if (currentTokens + t > MAX_TOKENS && current.length) {
      const overlap = overlapTail(current, OVERLAP_TOKENS);
      flush();
      current = [...overlap];
      currentTokens = overlap.reduce((sum, p) => sum + tokensOf(p), 0);
    }
    current.push(paragraph);
    currentTokens += t;
  }
  flush();

  const header = [meta.title, meta.channel].filter(Boolean).join(" — ");

  return pieces.map((content, index) => ({
    index,
    content,
    embeddingText: header ? `${header}: ${content}` : content,
    tokenCount: tokensOf(content),
  }));
}
