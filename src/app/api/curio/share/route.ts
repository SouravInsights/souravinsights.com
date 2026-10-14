import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminLimiter, clientIp } from "@/lib/links/ratelimit";
import { getConversation, saveConversation } from "@/lib/curio/conversations";
import type { UIMessage } from "ai";

/**
 * Share a chat session, and read one back.
 *
 * POST is the owner's: a bearer key, the same one clean-up uses. GET is public
 * by id, because the whole point of sharing is that whoever holds the link can
 * open it. Nothing lists or searches these.
 */

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
});

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.ADMIN_SECRET}`
  ) {
    return err("unauthorized", "Missing or invalid admin key", 401);
  }

  const rate = await adminLimiter.limit(clientIp(request.headers));
  if (!rate.success) return err("rate_limited", "Too many requests", 429);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err("invalid_body", "Body must be { messages }", 400);

  const saved = await saveConversation(parsed.data.messages as UIMessage[]);
  return NextResponse.json({
    data: { id: saved.id, title: saved.title, url: `/curio/${saved.id}` },
  });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const conversation = await getConversation(id);
  if (!conversation) return err("not_found", "No such conversation", 404);

  return NextResponse.json(
    {
      data: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        messages: conversation.messages,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=300" } }
  );
}
