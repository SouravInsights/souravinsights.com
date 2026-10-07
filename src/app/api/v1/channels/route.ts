import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { apiLimiter, clientIp } from "@/lib/links/ratelimit";

export async function GET(request: NextRequest) {
  const rate = await apiLimiter.limit(clientIp(request.headers));
  const rateHeaders = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(rate.reset),
  };
  if (!rate.success) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many requests" } },
      { status: 429, headers: rateHeaders }
    );
  }

  const rows = await db
    .select({ channel: links.channel, count: count() })
    .from(links)
    .where(and(isNull(links.hiddenAt), ne(links.health, "dead")))
    .groupBy(links.channel)
    .orderBy(links.channel);

  return NextResponse.json(
    { data: rows },
    {
      headers: {
        ...rateHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
