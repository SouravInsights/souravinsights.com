import { schedules, logger } from "@trigger.dev/sdk/v3";
import { and, asc, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { closeRenderer } from "@/lib/kb/render";
import { ingestLink } from "@/lib/kb/ingest";
import { mapWithConcurrency } from "@/lib/links/health";

/**
 * Weekly re-read (docs/spec/insights-agent.md). Pages change — a tool ships a
 * new feature, an article gets rewritten — and a knowledge base that answers
 * from a 2023 snapshot is worse than one that admits ignorance.
 *
 * Two deliberate choices:
 *
 * **Only links we actually fetched.** A `skipped` channel (portfolios, design,
 * newsletters) gets its text from the database row, not from a page, so nothing
 * about it can go stale. It has no `content_hash` either — `extract` returns
 * early for those, by design.
 *
 * **A rotation, not a date window.** Ordering by least-recently-read and
 * capping the run means every link is re-read every few weeks and none is frozen
 * forever. A "links added in the last 90 days" filter looked reasonable until
 * the numbers were checked: it covered 79 of 500 links, so 84% of the collection
 * would never have been re-read at all — and `content_hash` would have been
 * consulted only for the newest slice. The cap is what bounds cost, not the
 * date.
 *
 * The fetch always happens — we can't know a page changed without asking it.
 * What `onlyIfChanged` skips is the embedding, which is the part that costs
 * money.
 */

/** Ceiling per run, so one bad week can't turn into a crawl. */
const MAX_LINKS = 100;
/** Same as the bulk script: 4 at a time, sharing one browser. */
const CONCURRENCY = 4;

export const kbRefresh = schedules.task({
  id: "kb-refresh",
  // Monday 10:00 UTC — an hour after the health sweep, so rows that died
  // overnight are already marked `dead` and skipped here.
  cron: "0 10 * * 1",
  run: async () => {
    const rows = await db
      .select({
        id: links.id,
        url: links.url,
        title: links.title,
        description: links.description,
        channel: links.channel,
        contentHash: links.contentHash,
      })
      .from(links)
      .where(
        and(
          inArray(links.extractStatus, ["ok", "thin", "failed"]),
          isNull(links.hiddenAt),
          ne(links.health, "dead")
        )
      )
      .orderBy(asc(links.extractedAt))
      .limit(MAX_LINKS);

    logger.info("kb refresh starting", { candidates: rows.length });

    let changed = 0;
    let unchanged = 0;
    let passages = 0;
    let errors = 0;

    try {
      await mapWithConcurrency(rows, CONCURRENCY, async (row) => {
        try {
          const outcome = await ingestLink(row, { onlyIfChanged: true });
          if (outcome.changed) {
            changed++;
            passages += outcome.passages;
            logger.info("page changed, re-embedded", {
              url: row.url,
              status: outcome.status,
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
      // The render fallback reuses one browser; release it so the run exits.
      await closeRenderer();
    }

    const summary = { candidates: rows.length, changed, unchanged, passages, errors };
    logger.info("kb refresh done", summary);
    return summary;
  },
});
