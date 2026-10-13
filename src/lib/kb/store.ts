import { createHash } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { links, linkChunks } from "@/db/schema";
import type { Category } from "./categories";
import type { PageRead } from "./read";
import { chunkMarkdown, type ChunkUnit } from "./chunk";
import { EMBEDDING_MODE, embedTexts, type EmbeddingMode } from "./embed";
import { understandPage, PROMPT_VERSION } from "./understand";
import { getPage, isHtml } from "./get";
import { readPage } from "./read";
import { buildLetterCanonical, cleanTopics } from "./topics";

/**
 * store — every write the pipeline makes, plus buildLink, the one orchestrator.
 * Anyone asking "where does X get written?" starts here.
 *
 * Below this many words a page reads as `thin`: a paywall, a JS shell, a stub.
 */
export const THIN_WORDS = 200;

/** Passages go in per page, in batches, so one long page can't blow a statement. */
const INSERT_BATCH = 50;

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

export interface LinkRow {
  id: number;
  url: string;
  urlKey: string;
  title: string;
  description: string;
  markdown: string | null;
  contentHash: string | null;
  category: string | null;
  summary: string | null;
  /** Which prompt produced category/topics/summary; null = never understood. */
  promptVersion?: number | null;
}

/** Write the read stage's outcome. Returns the status and whether text changed. */
export async function saveRead(
  link: LinkRow,
  read: PageRead | null
): Promise<{ status: "ok" | "thin" | "failed"; changed: boolean }> {
  if (!read) {
    await db
      .update(links)
      .set({ readStatus: "failed", updatedAt: new Date() })
      .where(eq(links.id, link.id));
    return { status: "failed", changed: false };
  }

  const contentHash = sha256(read.markdown);
  const changed = contentHash !== link.contentHash;

  await db
    .update(links)
    .set({
      markdown: read.markdown,
      wordCount: read.wordCount,
      contentHash,
      readStatus: read.wordCount < THIN_WORDS ? "thin" : "ok",
      extractedAt: new Date(),
      updatedAt: new Date(),
      // Backfill the title for links that came in as "Untitled".
      ...(read.title && !link.title ? { title: read.title } : {}),
      // The page's own description replaces the intake blurb when there is one.
      ...(read.description ? { description: read.description } : {}),
    })
    .where(eq(links.id, link.id));

  return {
    status: read.wordCount < THIN_WORDS ? "thin" : "ok",
    changed,
  };
}

/** Write the understand stage's outcome. */
export async function saveUnderstand(
  link: LinkRow,
  result: { category: Category; topics: string[]; summary: string }
): Promise<void> {
  await db
    .update(links)
    .set({
      category: result.category,
      topics: result.topics,
      summary: result.summary,
      embeddingMode: EMBEDDING_MODE[result.category],
      promptVersion: PROMPT_VERSION,
      analyzedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(links.id, link.id));
}

/**
 * Embed and store a link's passages — its summary first (always), then its
 * content units when the mode is `full`. Passages are replaced wholesale:
 * a page that got shorter can't leave a stale tail.
 */
export async function savePassages(
  link: LinkRow,
  opts: { summary: string; units?: ChunkUnit[]; title: string }
): Promise<number> {
  const passages: {
    content: string;
    unitType: "summary" | "prose" | "code";
    heading: string | null;
    tokenCount: number;
    embeddingText: string;
  }[] = [
    {
      content: opts.summary,
      unitType: "summary",
      heading: null,
      tokenCount: Math.ceil(opts.summary.split(/\s+/).length * 1.3),
      embeddingText: `${opts.title}: ${opts.summary}`,
    },
    ...(opts.units ?? []).map((u) => ({
      content: u.content,
      unitType: u.unitType,
      heading: u.heading,
      tokenCount: u.tokenCount,
      embeddingText: u.embeddingText,
    })),
  ];

  const embeddings = await embedTexts(passages.map((p) => p.embeddingText));

  await db.delete(linkChunks).where(eq(linkChunks.linkId, link.id));
  for (let i = 0; i < passages.length; i += INSERT_BATCH) {
    await db.insert(linkChunks).values(
      passages.slice(i, i + INSERT_BATCH).map((p, j) => ({
        linkId: link.id,
        chunkIndex: i + j,
        content: p.content,
        tokenCount: Math.min(p.tokenCount, 32767),
        unitType: p.unitType,
        heading: p.heading,
        embedding: embeddings[i + j],
      }))
    );
  }

  return passages.length;
}

export interface BuildOptions {
  /** Re-run stages even when their columns are already set. */
  force?: boolean;
  /** Render thin pages headlessly and re-read (needs the shared browser). */
  render?: boolean;
  /** Topics already in use — passed to describe as the vocabulary leash. */
  knownTopics?: string[];
  /** Winning spellings learned by buildTopicVocabulary — the topic policy's map. */
  winningSpellings?: Record<string, string>;
}

export interface BuildOutcome {
  read: "ok" | "thin" | "failed" | "skipped";
  understood: boolean;
  passages: number;
  changed: boolean;
}

/**
 * The four verbs for one link: get → read → understand → embed.
 * Stages skip themselves when their columns are set, unless `force`.
 * Never throws — one bad page must not stop a run.
 */
export async function buildLink(
  link: LinkRow,
  opts: BuildOptions = {}
): Promise<BuildOutcome> {
  let read: PageRead | null = null;
  let readStatus: BuildOutcome["read"] = "skipped";
  let changed = false;

  const needsRead = opts.force || !link.markdown;
  if (needsRead) {
    const page = await getPage(link.url);
    if (page && isHtml(page.contentType)) {
      read = await readPage(page.html, page.finalUrl);
    }

    // Static path gave us nothing useful — thin page, error page, bot wall,
    // no page at all. Same answer for every shape of empty: ask the browser.
    if (opts.render && (read === null || read.wordCount < THIN_WORDS)) {
      const { renderHtml } = await import("./render");
      const rendered = await renderHtml(link.url).catch(() => null);
      if (rendered?.html) {
        const renderedRead = await readPage(rendered.html, link.url);
        if (renderedRead && renderedRead.wordCount > (read?.wordCount ?? 0)) {
          read = renderedRead;
        }
      }
    }

    const saved = await saveRead(link, read);
    readStatus = saved.status;
    changed = saved.changed;

    // A page no method could read stays answerable at the smallest honest
    // level: its intake title + description as the single passage.
    if (saved.status === "failed" && (link.title || link.description)) {
      await savePassages(link, {
        title: link.title || link.urlKey,
        summary: [link.title, link.description].filter(Boolean).join("\n\n"),
      });
    }
    link.markdown = read?.markdown ?? null;
    link.contentHash = read ? sha256(read.markdown) : link.contentHash;
    if (read?.title && !link.title) link.title = read.title;
  }

  let understood = false;
  // A forced re-read whose markdown didn't change must not re-spend the
  // model calls — the hash comparison is what makes a render retry cheap.
  // (Re-understanding everything WITHOUT refetching is kb-reclassify's job;
  // it reuses reunderstand() below, not a flag here.)
  // A row understood by an older PROMPT_VERSION is stale: decide it again.
  // That check is the whole reclassify mechanism — the version on the row is
  // the only memory it needs, and no flag or refetch is involved.
  const needsUnderstand =
    link.markdown &&
    (!link.category ||
      link.promptVersion !== PROMPT_VERSION ||
      (opts.force && changed));
  if (needsUnderstand) {
    // Metadata comes from the row: saveRead already stored defuddle's own
    // title/description during the read stage.
    const result = await understandPage({
      url: link.url,
      title: read?.title ?? link.title,
      description: read?.description || link.description,
      site: read?.site ?? "",
      author: read?.author ?? "",
      published: read?.published ?? "",
      markdown: link.markdown!,
      knownTopics: opts.knownTopics ?? [],
      winningSpellings: opts.winningSpellings ?? {},
    });
    await saveUnderstand(link, result);
    link.category = result.category;
    link.summary = result.summary;
    understood = true;
  }

  let passages = 0;
  const ready = Boolean(link.category && link.summary);
  const needsEmbed = ready && (understood || changed);
  if (needsEmbed) {
    const mode = EMBEDDING_MODE[link.category as Category] as EmbeddingMode;
    const units =
      mode === "full" && link.markdown
        ? chunkMarkdown(link.markdown, { title: link.title })
        : [];
    passages = await savePassages(link, {
      title: link.title || link.urlKey,
      summary: link.summary!,
      units,
    });
  }

  return { read: readStatus, understood, passages, changed };
}

/**
 * settleSpellings — after a run, merge letter-proven topic variants across
 * rows ("data-visualization" here, "data visualization" there) that the
 * run's vocabulary map couldn't know before the run existed. Deterministic,
 * no model, and topics aren't embedded — so rewrites here never re-embed.
 * Returns how many rows changed.
 */
export async function settleSpellings(): Promise<number> {
  const rows = await db
    .select({ id: links.id, topics: links.topics })
    .from(links)
    .where(isNull(links.hiddenAt));
  const winners = buildLetterCanonical(rows.map((r) => r.topics));

  let changedRows = 0;
  for (const row of rows) {
    if (!row.topics?.length) continue;
    const next = cleanTopics(row.topics, winners);
    if (JSON.stringify(next) !== JSON.stringify(row.topics)) {
      await db.update(links).set({ topics: next }).where(eq(links.id, row.id));
      changedRows++;
    }
  }
  return changedRows;
}
