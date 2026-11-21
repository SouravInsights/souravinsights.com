import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLimiter, clientIp } from "@/lib/links/ratelimit";
import { findCitations } from "@/lib/kb/writing-desk";
import { flushTraces } from "@/lib/observability/neatlogs";

// The call embeds every claim, then runs one model pass.
export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  // 20 chars is the floor where there's a claim worth searching at all; 8000
  // bounds what a pasted essay can cost.
  draft: z.string().trim().min(20).max(8000),
});

/**
 * The Writing Desk endpoint — admin only, for now. It spends a model call, and
 * the surface it belongs to is the author's own writing. The public version
 * waits until the loop has earned it on a real article.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const rate = await adminLimiter.limit(clientIp(request.headers));
  if (!rate.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests — try again shortly." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "Body must be { draft: string } (20–8000 chars)." },
      { status: 400 }
    );
  }

  try {
    const result = await findCitations(parsed.data.draft);
    // Send the recorded model calls now (see flushTraces) instead of waiting
    // for Neatlogs' next batch.
    await flushTraces();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "desk_failed",
        message:
          error instanceof Error ? error.message : "Could not search the collection.",
      },
      { status: 502 }
    );
  }
}
