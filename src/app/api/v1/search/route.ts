import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { searchQuerySchema } from "@/lib/links/api-schemas";
import { apiLimiter, clientIp } from "@/lib/links/ratelimit";
import { search } from "@/lib/kb/search";

// An embedding call plus a vector query — not an edge route.
export const runtime = "nodejs";

const err = (
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit
) => NextResponse.json({ error: { code, message } }, { status, headers });

/**
 * Semantic search over the knowledge base — the retrieval half of the Ask agent
 * with no model in the loop. That makes it cheap, deterministic, and quotable:
 * the same query gives the same answer, and nothing is generated, so there is
 * nothing to hallucinate.
 *
 * Results use the same item shape as `/api/v1/links`, plus the score and the
 * matching passage, so a client can treat a search hit like any other link.
 */
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

  const parsed = searchQuerySchema.safeParse(
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

  const { q, channel, limit } = parsed.data;

  try {
    const hits = await search(q, { channel, limit });

    if (hits.length === 0) {
      return NextResponse.json(
        { data: [], meta: { query: q, count: 0 } },
        { headers: rateHeaders }
      );
    }

    // Ranking comes from the vector search; the display fields come from one
    // extra query, so the order of `hits` is what decides the order of results.
    const rows = await db
      .select({
        urlKey: links.urlKey,
        discordId: links.discordId,
        description: links.description,
        addedAt: links.addedAt,
      })
      .from(links)
      .where(
        inArray(
          links.urlKey,
          hits.map((hit) => hit.urlKey)
        )
      );
    const extras = new Map(rows.map((row) => [row.urlKey, row]));

    return NextResponse.json(
      {
        data: hits.map((hit) => {
          const extra = extras.get(hit.urlKey);
          return {
            id: hit.urlKey,
            like_key: extra?.discordId == null ? null : extra.discordId.toString(),
            url: hit.url,
            title: hit.title,
            description: extra?.description ?? "",
            channel: hit.channel,
            added_at: (extra?.addedAt ?? new Date()).toISOString(),
            score: Number(hit.score.toFixed(4)),
            passage: hit.passages[0]?.content ?? "",
          };
        }),
        meta: { query: q, count: hits.length },
      },
      {
        headers: {
          ...rateHeaders,
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    // Embedding provider down, or the database. Neither is the caller's fault.
    return err("search_failed", "Search is unavailable right now", 502, rateHeaders);
  }
}
