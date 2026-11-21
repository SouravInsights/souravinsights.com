import { NextRequest, NextResponse } from "next/server";
import type { UIMessage } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { links } from "@/db/schema";
import { runAgent } from "@/lib/kb/agent";
import { chatDailyLimiter, chatLimiter, clientIp } from "@/lib/links/ratelimit";
import { readDailyUsage, recordQuestion } from "@/lib/curio/budget";
import {
  MAX_MESSAGES,
  isFromOurOwnPages,
  trimHistory,
} from "@/lib/curio/guard";

// The agent runs a few model round-trips per question; give the route room.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The Ask endpoint — the panel posts a conversation and gets a streamed answer.
 * No auth, because the collection is public, so it is guarded in layers: only
 * our own pages may ask, per minute for bursts, per address per day, and a daily
 * ceiling for everyone together, which is the only one that bounds a bill.
 */
export async function POST(request: NextRequest) {
  // A header nobody can be trusted to send honestly, and enough to turn away
  // the casual case: a script pointed at the endpoint.
  if (!isFromOurOwnPages(request)) {
    return NextResponse.json(
      { error: "forbidden", message: "Ask from the site itself." },
      { status: 403 }
    );
  }

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

  const usage = await readDailyUsage();
  if (usage.exhausted) {
    return NextResponse.json(
      {
        error: "budget_spent",
        message: "Curio has answered plenty today. Try again tomorrow.",
      },
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
  if (body.messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: "too_many_messages", message: "That conversation is too long." },
      { status: 413 }
    );
  }

  // Only the recent turns reach the model, each text part capped.
  const messages = trimHistory(body.messages);
  const hooks = { onFinish: (tokens: number) => void recordQuestion(tokens) };

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
        await runAgent(
          messages,
          { linkId: link.id, title: link.title, url: link.url },
          hooks
        )
      ).toUIMessageStreamResponse();
    }
    // Unknown linkId: fall through to the unscoped agent rather than fail.
  }

  return (await runAgent(messages, undefined, hooks)).toUIMessageStreamResponse();
}
