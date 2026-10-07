import { eq } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { normalizeUrl } from "@/app/curated-links/utils/urlUtils";

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
