import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links, linkChunks } from "@/db/schema";
import { chunkText } from "./chunk";
import { embedTexts } from "./embed";
import { extract, type ExtractStatus } from "./extract";

/**
 * Reading a link and storing its passages — the shared middle of the pipeline.
 *
 * Two callers use it: `scripts/kb-extract.ts` (the first read) and
 * `src/trigger/kb-refresh.ts` (the weekly re-read). They must not drift. A
 * refresh that stores passages differently from the first read is a silent
 * quality regression, and the eval numbers only stay comparable between runs if
 * both paths chunk and embed the same way.
 *
 * One storage rule lives here rather than in the callers: **what text gets
 * stored**. A channel we never fetch (portfolios, design, newsletters) still
 * stores its title and description as a single passage — otherwise those links
 * are invisible to search.
 */

/** Passages go in per page, in batches, so one long page can't blow a statement. */
const INSERT_BATCH = 50;

export interface LinkToIngest {
  id: number;
  url: string;
  title: string;
  description: string;
  channel: string;
  /** The hash from the previous read — how we tell whether the page changed. */
  contentHash: string | null;
}

export interface IngestOutcome {
  status: ExtractStatus;
  /** Passages written *this run*. 0 when nothing changed or no text was found. */
  passages: number;
  /** Did the page's text differ from the last read? */
  changed: boolean;
}

/**
 * @param dry            read and chunk, write nothing (the QA loop's `--dry`)
 * @param onlyIfChanged  skip the embed+store when the text is byte-identical to
 *                       the last read. The fetch still happens — we can't know
 *                       a page changed without asking it. What we skip is the
 *                       part that costs money.
 */
export async function ingestLink(
  link: LinkToIngest,
  opts: { dry?: boolean; onlyIfChanged?: boolean } = {}
): Promise<IngestOutcome> {
  const result = await extract(link.url, link.channel);

  const text =
    result.text ||
    (result.status === "skipped"
      ? [link.title, link.description].filter(Boolean).join("\n\n").trim()
      : "");

  const changed = result.contentHash !== link.contentHash;

  if (opts.onlyIfChanged && !changed) {
    return { status: result.status, passages: 0, changed: false };
  }

  let passages = 0;

  if (text) {
    const chunks = chunkText(text, {
      title: result.title || link.title,
      channel: link.channel,
    });
    const embeddings = await embedTexts(chunks.map((c) => c.embeddingText));
    passages = chunks.length;

    if (!opts.dry) {
      // Replace wholesale: a page that got shorter can't leave a stale tail.
      await db.delete(linkChunks).where(eq(linkChunks.linkId, link.id));
      for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
        await db.insert(linkChunks).values(
          chunks.slice(i, i + INSERT_BATCH).map((chunk, j) => ({
            linkId: link.id,
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            embedding: embeddings[i + j],
          }))
        );
      }
    }
  }

  if (!opts.dry) {
    await db
      .update(links)
      .set({
        rawText: text || null,
        contentHash: result.contentHash,
        extractStatus: result.status,
        extractedAt: new Date(),
        updatedAt: new Date(),
        // Backfill the title for links that came in as "Untitled".
        ...(result.title && !link.title ? { title: result.title } : {}),
      })
      .where(eq(links.id, link.id));
  }

  return { status: result.status, passages, changed };
}
