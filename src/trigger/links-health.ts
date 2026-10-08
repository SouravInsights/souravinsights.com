import { schedules, logger } from "@trigger.dev/sdk/v3";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { checkUrlHealth, mapWithConcurrency } from "@/lib/links/health";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";

/**
 * Weekly health sweep (docs/spec/links-registry-and-api.md §2). Conclusive
 * death (404/410/DNS) kills immediately; ambiguous failures need 3 consecutive
 * failed weeks. `dead` rows are never re-polled (no resurrection) and
 * `uncheckable` rows are left alone — rechecking a bot wall proves nothing.
 */
export const linksHealthCheck = schedules.task({
  id: "links-health-check",
  cron: "0 9 * * 1", // Monday 09:00 UTC
  run: async () => {
    const rows = await db
      .select({
        id: links.id,
        url: links.url,
        health: links.health,
        consecutiveFailures: links.consecutiveFailures,
      })
      .from(links)
      .where(
        and(
          ne(links.health, "dead"),
          ne(links.health, "uncheckable"),
          // Admin-hidden rows earn no checks — nobody sees them anyway.
          isNull(links.hiddenAt)
        )
      );

    logger.info("health sweep starting", { count: rows.length });

    let dead = 0;
    let recovered = 0;
    let markedDead = 0;

    await mapWithConcurrency(rows, 10, async (row) => {
      const result = await checkUrlHealth(row.url);
      const now = new Date();
      const base = { healthCheckedAt: now, updatedAt: now };

      if (result.verdict === "alive") {
        if (row.health === "dying") recovered++;
        try {
          await db
            .update(links)
            .set({
              ...base,
              health: "alive",
              consecutiveFailures: 0,
              url: result.finalUrl,
              urlKey: normalizeUrl(result.finalUrl),
            })
            .where(eq(links.id, row.id));
        } catch {
          // The redirect target is already tracked under another row.
          logger.warn("redirect target duplicates another link", {
            id: row.id,
            url: result.finalUrl,
          });
        }
        return;
      }

      if (result.verdict === "dead") {
        markedDead++;
        await db
          .update(links)
          .set({ ...base, health: "dead", consecutiveFailures: 0 })
          .where(eq(links.id, row.id));
        return;
      }

      if (result.verdict === "uncheckable") {
        await db
          .update(links)
          .set({ ...base, health: "uncheckable" })
          .where(eq(links.id, row.id));
        return;
      }

      // Ambiguous failure: count the strike; 3 failed weeks in a row → dead.
      const failures = row.consecutiveFailures + 1;
      if (failures >= 3) markedDead++;
      else dead++;
      await db
        .update(links)
        .set({
          ...base,
          health: failures >= 3 ? "dead" : "dying",
          consecutiveFailures: failures,
        })
        .where(eq(links.id, row.id));
    });

    const summary = { checked: rows.length, dying: dead, recovered, markedDead };
    logger.info("health sweep done", summary);
    return summary;
  },
});
