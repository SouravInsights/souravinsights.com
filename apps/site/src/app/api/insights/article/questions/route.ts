import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { links } from "@/db/schema";
import { generateObject } from "@/lib/observability/neatlogs";
import { pipelineModel } from "@/lib/kb/model";
import { isFromOurOwnPages } from "@/lib/curio/guard";
import { chatLimiter, clientIp } from "@/lib/links/ratelimit";
import redis from "@/app/lib/redis";

/**
 * The Co-Reader's starter questions for one article.
 *
 * Written once per article and kept in Redis, because they never change while
 * the page's summary doesn't. The summary already exists (written at build
 * time, in the page's own voice), so this is a small copy job over text we
 * already paid for — not a fresh read of the article.
 *
 * Public but guarded like every other model route: our own pages only, one
 * request per minute per address, and an empty list on any failure so the rail
 * simply shows no chips rather than an error.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const TTL_SECONDS = 60 * 60 * 24 * 90;
const key = (urlKey: string) => `insights:questions:${urlKey}`;

const Schema = z.object({
  questions: z.array(z.string()).min(1).max(6),
});

export async function POST(request: NextRequest) {
  if (!isFromOurOwnPages(request)) {
    return NextResponse.json({ data: { questions: [] } });
  }

  const limit = await chatLimiter.limit(clientIp(request.headers));
  if (!limit.success) return NextResponse.json({ data: { questions: [] } });

  const body = (await request.json().catch(() => null)) as {
    urlKey?: string;
  } | null;
  const urlKey = body?.urlKey;
  if (!urlKey) return NextResponse.json({ data: { questions: [] } });

  const cached = await redis.get<string[]>(key(urlKey)).catch(() => null);
  if (Array.isArray(cached)) {
    return NextResponse.json({ data: { questions: cached } });
  }

  const [row] = await db
    .select({ title: links.title, summary: links.summary })
    .from(links)
    .where(
      and(
        eq(links.urlKey, urlKey),
        eq(links.category, "article"),
        isNull(links.hiddenAt),
        ne(links.health, "dead"),
      ),
    )
    .limit(1);

  if (!row?.summary) {
    return NextResponse.json({ data: { questions: [] } });
  }

  try {
    const { object } = await generateObject({
      model: pipelineModel(),
      schema: Schema,
      temperature: 0.4,
      prompt: [
        "You write the starter questions shown beside an article a reader is",
        "reading. They must be answerable from the article itself.",
        "",
        `Title: ${row.title}`,
        `Summary: ${row.summary}`,
        "",
        "Write 4 questions. Each one: a full sentence question, specific to",
        "this article's subject (name the people, works or ideas it mentions),",
        "no clickbait, no yes/no, no 'what is the main idea'. Plain and curious.",
      ].join("\n"),
    });
    const questions = object.questions
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 4);
    await redis.set(key(urlKey), questions, { ex: TTL_SECONDS }).catch(() => undefined);
    return NextResponse.json({ data: { questions } });
  } catch {
    return NextResponse.json({ data: { questions: [] } });
  }
}
