import { NextRequest, NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { runAgent } from "@/lib/kb/agent";
import { chatDailyLimiter, chatLimiter, clientIp } from "@/lib/links/ratelimit";

// The agent runs a few model round-trips per question; give the route room.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The Ask endpoint — the panel posts a conversation and gets a streamed answer.
 * No auth (the collection is public), so it is rate-limited twice: per minute
 * for bursts, per day against cost abuse.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);

  const [minute, day] = await Promise.all([
    chatLimiter.limit(ip),
    chatDailyLimiter.limit(ip),
  ]);
  if (!minute.success || !day.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many questions — try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: UIMessage[];
    linkId?: number;
  } | null;
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json(
      { error: "invalid_body", message: "Body must be { messages: UIMessage[] }" },
      { status: 400 }
    );
  }

  // Scoped ask (the reader's composer): the agent answers about one article,
  // from its passages alone.
  if (body.linkId) {
    const [link] = await db
      .select({ id: links.id, title: links.title, url: links.url })
      .from(links)
      .where(and(eq(links.id, body.linkId), isNull(links.hiddenAt)))
      .limit(1);
    if (link) {
      return (
        await runAgent(body.messages, {
          linkId: link.id,
          title: link.title,
          url: link.url,
        })
      ).toUIMessageStreamResponse();
    }
    // Unknown linkId: fall through to the unscoped agent rather than fail.
  }

  return (await runAgent(body.messages)).toUIMessageStreamResponse();
}
