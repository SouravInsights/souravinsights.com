import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { tasks } from "@trigger.dev/sdk";
import { and, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";
import { requireAdmin } from "@/lib/admin-auth";
import { addLinkRequestSchema, linksQuerySchema } from "@/lib/links/api-schemas";
import { adminLimiter, apiLimiter, clientIp } from "@/lib/links/ratelimit";
import { checkUrlHealth } from "@/lib/links/health";
import { fetchPageMetadata } from "@/lib/links/metadata";
import type { kbBuildLink } from "@/trigger/kb-build-link";

const SELECT = {
  id: links.id,
  urlKey: links.urlKey,
  discordId: links.discordId,
  url: links.url,
  title: links.title,
  description: links.description,
  category: links.category,
  addedAt: links.addedAt,
} as const;

interface Row {
  id: number;
  urlKey: string;
  discordId: bigint | null;
  url: string;
  title: string;
  description: string;
  category: string | null;
  addedAt: Date;
}

const serialize = (row: Row) => ({
  id: row.urlKey,
  like_key: row.discordId === null ? null : row.discordId.toString(),
  url: row.url,
  title: row.title,
  description: row.description,
  category: row.category,
  added_at: row.addedAt.toISOString(),
});

const VISIBLE = () => and(isNull(links.hiddenAt), ne(links.health, "dead"));

const err = (
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit
) => NextResponse.json({ error: { code, message } }, { status, headers });

function decodeCursor(raw: string): { a: string; i: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof parsed?.a !== "string" || typeof parsed?.i !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rate = await apiLimiter.limit(clientIp(request.headers));
  const rateHeaders = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(rate.reset),
  };
  if (!rate.success) {
    return err("rate_limited", "Too many requests", 429, rateHeaders);
  }

  const parsed = linksQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return err(
      "invalid_query",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
      400,
      rateHeaders
    );
  }

  const { category, limit, cursor, url } = parsed.data;

  // Exact lookup mode: ?url= returns the single matching link or 404.
  if (url) {
    const rows = await db
      .select(SELECT)
      .from(links)
      .where(and(VISIBLE(), eq(links.urlKey, normalizeUrl(url))))
      .limit(1);
    if (rows.length === 0) {
      return err("not_found", "No link matches this URL", 404, rateHeaders);
    }
    return NextResponse.json(
      { data: [serialize(rows[0])], meta: { next_cursor: null } },
      { headers: rateHeaders }
    );
  }

  const conditions = [VISIBLE()];
  if (category) conditions.push(eq(links.category, category));

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) {
      return err("invalid_cursor", "Cursor is malformed", 400, rateHeaders);
    }
    const cursorDate = new Date(decoded.a);
    conditions.push(
      or(
        lt(links.addedAt, cursorDate),
        and(eq(links.addedAt, cursorDate), lt(links.id, decoded.i))
      )
    );
  }

  // limit+1 tells us whether another page exists.
  const rows = await db
    .select(SELECT)
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.addedAt), desc(links.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor =
    rows.length > limit && last
      ? Buffer.from(
          JSON.stringify({ a: last.addedAt.toISOString(), i: last.id })
        ).toString("base64url")
      : null;

  return NextResponse.json(
    { data: page.map(serialize), meta: { next_cursor: nextCursor } },
    {
      headers: {
        ...rateHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

/**
 * Add a link by hand. The category comes from the admin, so the pipeline skips
 * the classifier for this row (`source='web'`).
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const rate = await adminLimiter.limit(clientIp(request.headers));
  if (!rate.success) {
    return err("rate_limited", "Too many requests", 429);
  }

  const parsed = addLinkRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return err("invalid_body", "Body must be { url, category }", 400);
  }
  const { url, category } = parsed.data;

  // Never record a provably dead link.
  const health = await checkUrlHealth(url);
  if (health.verdict === "dead") {
    return err("dead_link", "That URL is dead (404 or DNS failure)", 422);
  }

  // The card shows a title, and a hand-added link has no Discord embed to
  // borrow one from. One small GET, no model, no browser.
  const metadata = await fetchPageMetadata(health.finalUrl);
  const urlKey = normalizeUrl(health.finalUrl);
  const now = new Date();

  const existing = await db
    .select({ id: links.id, category: links.category })
    .from(links)
    .where(eq(links.urlKey, urlKey))
    .limit(1);

  let linkId: number;
  if (existing.length > 0) {
    const changed = existing[0].category !== category;
    await db
      .update(links)
      .set({
        category,
        // Marked as hand-filed so the pipeline keeps this category.
        source: "web",
        hiddenAt: null,
        // A new category needs a new summary; the markdown is still good.
        ...(changed ? { summary: null, analyzedAt: null } : {}),
        updatedAt: now,
      })
      .where(eq(links.id, existing[0].id));
    linkId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(links)
      .values({
        urlKey,
        url: health.finalUrl,
        title: metadata.title,
        description: metadata.description,
        source: "web",
        channel: null,
        addedAt: now,
        category,
        readStatus: "pending",
        health: health.verdict === "retry" ? "dying" : health.verdict,
        consecutiveFailures: health.verdict === "retry" ? 1 : 0,
        healthCheckedAt: now,
      })
      .returning({ id: links.id });
    linkId = inserted.id;
  }

  // Read and summarize in the background. If this fails, the row stays pending
  // and the weekly refresh (never-read first) still picks it up.
  try {
    await tasks.trigger<typeof kbBuildLink>("kb-build-link", { linkId });
  } catch (error) {
    console.error("kb-build-link trigger failed", linkId, error);
  }

  revalidatePath("/insights");
  revalidatePath("/api/insights/latest");
  revalidateTag("links");

  return NextResponse.json({
    data: { id: urlKey, url: health.finalUrl, title: metadata.title, category },
  });
}
