import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { adminLimiter, clientIp } from "@/lib/links/ratelimit";
import { findCitations } from "@/lib/kb/writing-desk";

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
 *
 * Authorised two ways, matching what already exists: the `admin_session` cookie
 * (the page) or `Authorization: Bearer $ADMIN_SECRET` (curl, as the v1 admin
 * routes do). The browser must never hold the secret, hence the cookie path.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  const bearer =
    !!secret && request.headers.get("authorization") === `Bearer ${secret}`;

  if (!bearer && !isAdminAuthenticated()) {
    return NextResponse.json(
      { error: "unauthorized", message: "Admins only." },
      { status: 401 }
    );
  }

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
    return NextResponse.json(await findCitations(parsed.data.draft));
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
