import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, shareLimiter } from "@/lib/links/ratelimit";
import { getConversation, saveConversation } from "@/lib/curio/conversations";
import type { UIMessage } from "ai";

/**
 * Share a chat session, and read one back.
 *
 * Anyone can share, so this is a public write: rate limited per address, capped
 * in size, and read back only by id. Nothing lists or searches these, and the
 * shared page asks search engines to stay away.
 */

/** A conversation is text; anything approaching this is not one. */
const MAX_BYTES = 256 * 1024;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(100),
});

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  const rate = await shareLimiter.limit(`share:${clientIp(request.headers)}`);
  if (!rate.success) {
    return err("rate_limited", "Too many conversations shared just now", 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return err("too_large", "That conversation is too large to share", 413);
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return err("invalid_body", "Body must be JSON", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return err("invalid_body", "Body must be { messages }", 400);

  try {
    const saved = await saveConversation(parsed.data.messages as UIMessage[]);
    return NextResponse.json({
      data: { id: saved.id, title: saved.title, url: `/curio/${saved.id}` },
    });
  } catch (error) {
    // Say what failed instead of handing the browser a bare 500: this exact
    // case, the table not existing yet, looked like a mystery on the client.
    console.error("curio share failed", error);
    return NextResponse.json(
      {
        error: {
          code: "storage_unavailable",
          message: "Sharing is not available right now.",
        },
      },
      { status: 503 }
    );
  }
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
