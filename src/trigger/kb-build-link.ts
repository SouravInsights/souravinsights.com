import { queue, task, logger } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { buildLink, type LinkRow } from "@/lib/kb/store";

/**
 * Build one link. Triggered by the on-site intake route the moment a link is
 * added by hand.
 *
 * The weekly `kb-refresh` is a rotation over the whole collection and cannot be
 * pointed at a single row, so this is a separate task — it reuses the same
 * `buildLink`, so no pipeline is duplicated. One link added = one run.
 */

/** Caps how many builds run at once, so a burst of adds queues instead of
 *  firing a model call per link simultaneously. */
const kbBuildQueue = queue({
  name: "kb-build-link",
  concurrencyLimit: 3,
});

export const kbBuildLink = task({
  id: "kb-build-link",
  queue: kbBuildQueue,
  run: async (payload: { linkId: number }) => {
    const [row] = await db
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
      .where(eq(links.id, payload.linkId))
      .limit(1);

    if (!row) {
      logger.warn("link vanished before build", { linkId: payload.linkId });
      return { skipped: true };
    }

    const link: LinkRow = row;
    const outcome = await buildLink(link);
    logger.info("built link", {
      urlKey: link.urlKey,
      category: link.category,
      ...outcome,
    });

    // The page caches its list for 5 minutes; tell Next to rebuild now so the
    // finished card replaces the one that showed only the intake title.
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET }),
    }).catch(() => undefined);

    return outcome;
  },
});
