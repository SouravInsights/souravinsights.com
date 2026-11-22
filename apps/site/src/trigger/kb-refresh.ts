import { schedules, logger } from "@trigger.dev/sdk";
import { and, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { closeRenderer } from "@/lib/kb/render";
import { buildLink, type LinkRow } from "@/lib/kb/store";
import { mapWithConcurrency } from "@/lib/links/health";

/**
 * Weekly re-read. Pages change — a tool ships a new feature, an article gets
 * rewritten — and a knowledge base that answers from an old snapshot is worse
 * than one that admits ignorance.
 *
 * A rotation, not a date window: least-recently-read first, capped per run, so
 * every link cycles through roughly monthly. The read always happens (we can't
 * know a page changed without asking); `buildLink` re-understands and
 * re-embeds only when the markdown actually changed — that's the part that
 * costs money.
 */

/** Ceiling per run, so one bad week can't turn into a crawl. */
const MAX_LINKS = 100;
/** Four at a time, sharing one browser for renders. */
const CONCURRENCY = 4;

export const kbRefresh = schedules.task({
  id: "kb-refresh",
  // Monday 10:00 UTC — an hour after the health sweep, so rows that died
  // overnight are already marked `dead` and skipped here.
  cron: "0 10 * * 1",
  run: async () => {
    const rows: LinkRow[] = await db
      .select({
        id: links.id,
        url: links.url,
        urlKey: links.urlKey,
        title: links.title,
        description: links.description,
        source: links.source,
        markdown: links.markdown,
        contentHash: links.contentHash,
        category: links.category,
        summary: links.summary,
      })
      .from(links)
      .where(and(isNull(links.hiddenAt), ne(links.health, "dead")))
      // Never-read rows (extracted_at is null) come first; Postgres puts nulls
      // last on ASC by default, which would skip every newly added link.
      .orderBy(sql`${links.extractedAt} asc nulls first`)
      .limit(MAX_LINKS);

    logger.info("kb refresh starting", { candidates: rows.length });

    let changed = 0;
    let unchanged = 0;
    let passages = 0;
    let errors = 0;

    try {
      await mapWithConcurrency(rows, CONCURRENCY, async (row) => {
        try {
          // Force the read so the hash comparison runs; downstream stages
          // still skip themselves when nothing changed.
          const outcome = await buildLink(row, { force: true });
          if (outcome.changed) {
            changed++;
            passages += outcome.passages;
            logger.info("page changed, re-understood + re-embedded", {
              url: row.url,
              passages: outcome.passages,
            });
          } else {
            unchanged++;
          }
        } catch (error) {
          errors++;
          logger.warn("re-read failed", {
            url: row.url,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    } finally {
      await closeRenderer();
    }

    const summary = { candidates: rows.length, changed, unchanged, passages, errors };
    logger.info("kb refresh done", summary);
    return summary;
  },
});
