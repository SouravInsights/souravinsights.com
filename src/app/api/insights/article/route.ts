import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { highlights, links } from "@/db/schema";

/**
 * One article for the insights reader view: its stored markdown (pre-baked at
 * build time) plus the owner's highlights. Public — the page text is the same
 * one the reader renders.
 */
export async function GET(request: NextRequest) {
  const urlKey = request.nextUrl.searchParams.get("urlKey");
  if (!urlKey) {
    return NextResponse.json(
      { error: { code: "missing_param", message: "urlKey is required" } },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({
      id: links.id,
      url: links.url,
      urlKey: links.urlKey,
      title: links.title,
      markdown: links.markdown,
      wordCount: links.wordCount,
      addedAt: links.addedAt,
    })
    .from(links)
    .where(
      and(
        eq(links.urlKey, urlKey),
        eq(links.category, "article"),
        isNull(links.hiddenAt),
        ne(links.health, "dead")
      )
    )
    .limit(1);

  if (!row || !row.markdown) {
    return NextResponse.json(
      { error: { code: "not_found", message: "No readable article for this key" } },
      { status: 404 }
    );
  }

  const marks = await db
    .select({
      id: highlights.id,
      quote: highlights.quote,
      occurrence: highlights.occurrence,
      hue: highlights.hue,
    })
    .from(highlights)
    .where(and(eq(highlights.linkId, row.id), eq(highlights.stale, false)))
    .orderBy(highlights.createdAt);

  return NextResponse.json(
    { data: { ...row, marks } },
    { headers: { "cache-control": "public, max-age=60" } }
  );
}
