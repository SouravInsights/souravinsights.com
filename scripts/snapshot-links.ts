import "dotenv/config";
import { db } from "../src/db";
import { links } from "../src/db/schema";
import {
  extractDescription,
  extractTitle,
  extractUrl,
  getChannels,
  getMessagesFromChannel,
} from "../src/app/curated-links/utils/discordApi";
import {
  dedupeByUrl,
  normalizeUrl,
  snowflakeDate,
  sortByNewestId,
} from "../src/app/curated-links/utils/urlUtils";
import { checkUrlHealth, mapWithConcurrency } from "../src/lib/links/health";

// Usage: npx tsx scripts/snapshot-links.ts [--dry]
//
// One-time (but safely re-runnable) copy of the Discord collection into the
// links table. Health is checked BEFORE insert; provably dead URLs are never
// recorded. --dry reports verdicts without writing.

const DRY = process.argv.includes("--dry");

interface Candidate {
  id: string; // Discord snowflake
  url: string;
  title: string;
  description: string;
  channel: string;
  addedAt: Date;
}

async function collect(): Promise<Candidate[]> {
  const channels = await getChannels();
  const perChannel = await Promise.all(
    channels.map(async (channel) => {
      const messages = await getMessagesFromChannel(channel.id);
      return messages
        .map((msg): Candidate => {
          const url = extractUrl(msg.content, msg.embeds);
          return {
            id: msg.id,
            url,
            title: extractTitle(msg.embeds),
            description: extractDescription(msg.embeds),
            channel: channel.name,
            addedAt: snowflakeDate(msg.id),
          };
        })
        .filter((c) => c.url);
    })
  );

  // Newest first, then collapse cross-channel reposts (same rule as the page).
  return dedupeByUrl(sortByNewestId(perChannel.flat()));
}

async function main() {
  console.log("collecting from Discord…");
  const candidates = await collect();
  console.log(`unique links: ${candidates.length}`);

  let done = 0;
  const results = await mapWithConcurrency(candidates, 10, async (c) => {
    const health = await checkUrlHealth(c.url);
    done++;
    if (done % 50 === 0) console.log(`  checked ${done}/${candidates.length}`);
    return { candidate: c, health };
  });

  // Redirects can merge two different share links into one final URL.
  // The list is newest-first, so the first occurrence of a final key wins.
  const seen = new Set<string>();
  const rows: (typeof links.$inferInsert)[] = [];
  const dead: string[] = [];
  const tally: Record<string, number> = {};

  for (const { candidate, health } of results) {
    tally[health.verdict] = (tally[health.verdict] ?? 0) + 1;
    if (health.verdict === "dead") {
      dead.push(candidate.url);
      continue;
    }
    const urlKey = normalizeUrl(health.finalUrl);
    if (seen.has(urlKey)) continue;
    seen.add(urlKey);

    rows.push({
      urlKey,
      url: health.finalUrl,
      title: candidate.title === "Untitled" ? "" : candidate.title,
      description:
        candidate.description === "No description available"
          ? ""
          : candidate.description.replace(/\s+/g, " ").trim(),
      channel: candidate.channel,
      discordId: candidate.id,
      addedAt: candidate.addedAt,
      health:
        health.verdict === "retry"
          ? "dying"
          : (health.verdict as "alive" | "uncheckable"),
      consecutiveFailures: health.verdict === "retry" ? 1 : 0,
      healthCheckedAt: new Date(),
    });
  }

  console.log("\nverdicts:", JSON.stringify(tally));
  console.log(`dead, never recorded (${dead.length}):`);
  dead.forEach((u) => console.log(`  ✗ ${u}`));

  if (DRY) {
    console.log(`\n--dry: would insert ${rows.length} rows. Nothing written.`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const res = await db
      .insert(links)
      .values(batch)
      .onConflictDoNothing({ target: links.urlKey })
      .returning({ id: links.id });
    inserted += res.length;
  }

  console.log(`\ninserted: ${inserted} (of ${rows.length} eligible)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
