import { writeFileSync } from "fs";
import path from "path";
import {
  countComments,
  HnBlock,
  HnComment,
  HnInlineNode,
  parseHnHtml,
} from "../src/app/blog/utils/hnUtils";

// Usage: npx tsx scripts/export-hn-comments.ts <itemId> [outputFile]
//
// Exports a full Hacker News comment thread to a structured Markdown file,
// reusing the same HTML -> blocks parser as the site so the output matches what
// readers see. Karma is fetched from the Algolia user endpoint.

const ALGOLIA_ITEM_URL = "https://hn.algolia.com/api/v1/items";
const ALGOLIA_USER_URL = "https://hn.algolia.com/api/v1/users";
const HN_ITEM_URL = "https://news.ycombinator.com/item";

interface AlgoliaItem {
  id: number;
  author: string | null;
  created_at: string;
  text: string | null;
  title: string | null;
  url: string | null;
  points: number | null;
  type: string | null;
  children?: AlgoliaItem[];
}

function normalizeComments(items: AlgoliaItem[] | undefined): HnComment[] {
  if (!items?.length) return [];
  const comments: HnComment[] = [];

  for (const item of items) {
    if (item.type && item.type !== "comment") continue;
    const children = normalizeComments(item.children);
    const text = item.text?.trim();
    if (!text) {
      comments.push(...children);
      continue;
    }
    comments.push({
      id: item.id,
      author: item.author || "anonymous",
      createdAt: item.created_at,
      blocks: parseHnHtml(text),
      children,
      replyUrl: `${HN_ITEM_URL}?id=${item.id}`,
    });
  }

  return comments;
}

function collectAuthors(comments: HnComment[], set = new Set<string>()) {
  for (const comment of comments) {
    set.add(comment.author);
    collectAuthors(comment.children, set);
  }
  return set;
}

async function fetchKarma(usernames: string[]): Promise<Record<string, number>> {
  const karma: Record<string, number> = {};
  const limit = 8;

  for (let index = 0; index < usernames.length; index += limit) {
    await Promise.all(
      usernames.slice(index, index + limit).map(async (username) => {
        try {
          const response = await fetch(`${ALGOLIA_USER_URL}/${encodeURIComponent(username)}`);
          if (!response.ok) return;
          const data = (await response.json()) as { karma?: number };
          if (typeof data.karma === "number") karma[username] = data.karma;
        } catch {
          // best-effort; karma is optional in the export
        }
      }),
    );
  }

  return karma;
}

function inlineToMarkdown(nodes: HnInlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "link") return `[${node.value}](${node.href})`;
      if (node.type === "code") return `\`${node.value}\``;
      return node.value;
    })
    .join("");
}

function stripLeadingQuote(nodes: HnInlineNode[]): HnInlineNode[] {
  const [first, ...rest] = nodes;
  if (!first || first.type !== "text") return nodes;
  return [{ ...first, value: first.value.replace(/^\s*>\s?/, "") }, ...rest].filter(
    (node) => node.type !== "text" || node.value.length > 0,
  );
}

function blocksToMarkdown(blocks: HnBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "code") {
        return ["```", block.value.replace(/```/g, "``\u200b`"), "```"].join("\n");
      }

      const quoted =
        block.nodes[0]?.type === "text" && block.nodes[0].value.trimStart().startsWith(">");

      if (quoted) {
        return inlineToMarkdown(stripLeadingQuote(block.nodes))
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      }

      return inlineToMarkdown(block.nodes);
    })
    .join("\n\n");
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

function countByAuthor(comments: HnComment[], counts: Record<string, number>) {
  for (const comment of comments) {
    counts[comment.author] = (counts[comment.author] ?? 0) + 1;
    countByAuthor(comment.children, counts);
  }
}

function renderComment(
  comment: HnComment,
  storyAuthor: string | null,
  karma: Record<string, number>,
  depth: number,
  pathParts: number[],
): string {
  const headingLevel = Math.min(depth + 2, 6);
  const prefix = "#".repeat(headingLevel);
  const label = pathParts.join(".");
  const karmaLabel =
    typeof karma[comment.author] === "number"
      ? `${karma[comment.author].toLocaleString("en-US")} karma`
      : "karma n/a";
  const op = storyAuthor === comment.author ? " · [OP]" : "";
  const permalink = `${HN_ITEM_URL}?id=${comment.id}`;

  const header =
    `${prefix} ${label} · ${comment.author} · ${karmaLabel} · ` +
    `${formatTimestamp(comment.createdAt)}${op} · [HN](${permalink})`;

  const body = blocksToMarkdown(comment.blocks);

  const replies = comment.children
    .map((child, index) =>
      renderComment(child, storyAuthor, karma, depth + 1, [...pathParts, index + 1]),
    )
    .join("\n\n");

  return [header, "", body, replies ? `\n${replies}` : ""].filter(Boolean).join("\n");
}

async function main() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0) {
    console.error("Usage: npx tsx scripts/export-hn-comments.ts <itemId> [out]");
    process.exit(1);
  }

  const response = await fetch(`${ALGOLIA_ITEM_URL}/${id}`);
  if (!response.ok) {
    console.error(`Failed to fetch item ${id}: HTTP ${response.status}`);
    process.exit(1);
  }
  const item = (await response.json()) as AlgoliaItem;

  const comments = normalizeComments(item.children);
  const karma = await fetchKarma(Array.from(collectAuthors(comments)));

  const counts: Record<string, number> = {};
  countByAuthor(comments, counts);

  const participants = Object.keys(counts)
    .sort((a, b) => (karma[b] ?? -1) - (karma[a] ?? -1))
    .map(
      (author) =>
        `- **${author}**${item.author === author ? " (OP)" : ""} · ${
          typeof karma[author] === "number" ? karma[author].toLocaleString("en-US") : "?"
        } karma · ${counts[author]} ${counts[author] === 1 ? "comment" : "comments"}`,
    )
    .join("\n");

  const thread = comments
    .map((comment, index) => renderComment(comment, item.author, karma, 0, [index + 1]))
    .join("\n\n---\n\n");

  const markdown = [
    `# Hacker News discussion: ${item.title ?? `item ${id}`}`,
    "",
    `- **Story:** [${item.title ?? id}](${HN_ITEM_URL}?id=${id})`,
    `- **Points:** ${item.points ?? "n/a"}`,
    `- **Comments:** ${countComments(comments)}`,
    `- **Unique commenters:** ${Object.keys(counts).length}`,
    `- **Exported:** ${new Date().toISOString()}`,
    "",
    "> Full HN comment thread, oldest first. Replies are nested by heading level",
    "> and an outline number (`2.1.3` = first thread, first reply, third\n> message). `[OP]` marks the article author.",
    "",
    "## Participants",
    "",
    participants,
    "",
    "---",
    "",
    thread,
    "",
  ].join("\n");

  const output = process.argv[3] || path.join(process.cwd(), `hn-comments-${id}.md`);
  writeFileSync(output, markdown, "utf8");
  console.log(`Wrote ${output} (${markdown.length} bytes)`);
}

main();
