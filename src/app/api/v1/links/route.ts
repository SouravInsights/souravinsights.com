import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";
import { linksQuerySchema } from "@/lib/links/api-schemas";
import { apiLimiter, clientIp } from "@/lib/links/ratelimit";

const SELECT = {
  id: links.id,
  urlKey: links.urlKey,
  discordId: links.discordId,
  url: links.url,
  title: links.title,
  description: links.description,
  channel: links.channel,
  addedAt: links.addedAt,
} as const;

interface Row {
  id: number;
  urlKey: string;
  discordId: bigint | null;
  url: string;
  title: string;
  description: string;
  channel: string;
  addedAt: Date;
}

const serialize = (row: Row) => ({
  id: row.urlKey,
  like_key: row.discordId === null ? null : row.discordId.toString(),
  url: row.url,
  title: row.title,
  description: row.description,
  channel: row.channel,
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

  const { channel, limit, cursor, url } = parsed.data;

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
  if (channel) conditions.push(eq(links.channel, channel));

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
