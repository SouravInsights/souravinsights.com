// Shared types + helpers for rendering Hacker News discussion threads.
//
// We deliberately parse HN's comment HTML into a small, structured tree on the
// server instead of shipping raw HTML to the client and using
// `dangerouslySetInnerHTML`. That keeps rendering XSS-safe and lets React
// control styling of links, inline code and code blocks.

export interface HnInlineNode {
  type: "text" | "link" | "code";
  value: string;
  href?: string;
}

export type HnBlock =
  | { type: "paragraph"; nodes: HnInlineNode[] }
  | { type: "code"; value: string };

export interface HnComment {
  id: number;
  author: string;
  createdAt: string;
  blocks: HnBlock[];
  children: HnComment[];
  replyUrl: string;
}

export interface HnThread {
  id: number;
  title: string;
  points: number | null;
  author: string | null;
  createdAt: string;
  commentCount: number;
  hnUrl: string;
  comments: HnComment[];
}

/**
 * Pull the numeric item id out of any Hacker News item URL, e.g.
 * `https://news.ycombinator.com/item?id=49770204` -> `49770204`.
 */
export function extractHnItemId(url?: string | null): number | null {
  if (!url) return null;
  const match = url.match(/item\?id=(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Decode the small set of entities HN actually emits (plus numeric escapes). */
export function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|nbsp);/gi, (entity) => {
      switch (entity.toLowerCase()) {
        case "&amp;":
          return "&";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&nbsp;":
          return " ";
        default:
          return entity;
      }
    });
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "");
}

const INLINE_TOKEN_REGEX =
  /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<i>([\s\S]*?)<\/i>|<code>([\s\S]*?)<\/code>/gi;

const PRE_CODE_REGEX = /<pre>\s*<code>([\s\S]*?)<\/code>\s*<\/pre>/i;

function parseInline(input: string): HnInlineNode[] {
  const nodes: HnInlineNode[] = [];
  const text = input.replace(/<br\s*\/?>/gi, "\n");

  const pushText = (raw: string) => {
    const cleaned = decodeHtmlEntities(stripTags(raw));
    if (cleaned.trim().length > 0) {
      nodes.push({ type: "text", value: cleaned });
    }
  };

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_TOKEN_REGEX.lastIndex = 0;
  while ((match = INLINE_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushText(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // <a href="...">text</a>
      nodes.push({
        type: "link",
        value: decodeHtmlEntities(stripTags(match[2])),
        href: decodeHtmlEntities(match[1]),
      });
    } else if (match[3] !== undefined) {
      // <i>text</i> -> keep the words, drop the emphasis markup
      pushText(match[3]);
    } else if (match[4] !== undefined) {
      // inline <code>text</code>
      nodes.push({
        type: "code",
        value: decodeHtmlEntities(stripTags(match[4])),
      });
    }

    lastIndex = INLINE_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    pushText(text.slice(lastIndex));
  }

  return nodes;
}

function pushInlineParagraph(segment: string, blocks: HnBlock[]) {
  const nodes = parseInline(segment);
  if (nodes.length > 0) {
    blocks.push({ type: "paragraph", nodes });
  }
}

function pushParagraphWithCode(segment: string, blocks: HnBlock[]) {
  let rest = segment;
  let match: RegExpExecArray | null;

  PRE_CODE_REGEX.lastIndex = 0;
  while ((match = PRE_CODE_REGEX.exec(rest)) !== null) {
    pushInlineParagraph(rest.slice(0, match.index), blocks);
    blocks.push({
      type: "code",
      value: decodeHtmlEntities(stripTags(match[1])).replace(/\n+$/, ""),
    });
    rest = rest.slice(match.index + match[0].length);
  }

  pushInlineParagraph(rest, blocks);
}

/**
 * Convert HN's comment HTML into an array of paragraph / code blocks.
 * HN emits paragraphs as bare `<p>` separators (no closing tag), so we split
 * on those and then tokenize links, emphasis and code within each chunk.
 */
export function parseHnHtml(html: string | null | undefined): HnBlock[] {
  const blocks: HnBlock[] = [];
  if (!html) return blocks;

  for (const paragraph of html.split(/<p\s*>/i)) {
    pushParagraphWithCode(paragraph, blocks);
  }

  return blocks;
}

/** Total number of comments in a (sub)tree. */
export function countComments(comments: HnComment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.children),
    0
  );
}