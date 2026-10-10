import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";

/**
 * Admin visibility control. Hiding sets hidden_at (the link leaves the page,
 * feeds and API); restoring clears it. Never a hard delete.
 * Returns false when no row matches the URL.
 */
export async function setLinkHidden(
  url: string,
  hidden: boolean
): Promise<boolean> {
  const urlKey = normalizeUrl(url);
  const updated = await db
    .update(links)
    .set({ hiddenAt: hidden ? new Date() : null, updatedAt: new Date() })
    .where(eq(links.urlKey, urlKey))
    .returning({ id: links.id });
  return updated.length > 0;
}

/**
 * Batch form of the above, for clean-up. One UPDATE for the whole selection.
 * Returns how many rows actually matched — unknown URLs are simply skipped.
 */
export async function setLinksHidden(
  urls: string[],
  hidden: boolean
): Promise<number> {
  const urlKeys = urls.map(normalizeUrl).filter(Boolean);
  if (urlKeys.length === 0) return 0;

  const updated = await db
    .update(links)
    .set({ hiddenAt: hidden ? new Date() : null, updatedAt: new Date() })
    .where(inArray(links.urlKey, urlKeys))
    .returning({ id: links.id });
  return updated.length;
}
