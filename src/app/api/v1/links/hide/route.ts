import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hideRequestSchema } from "@/lib/links/api-schemas";
import { adminLimiter, clientIp } from "@/lib/links/ratelimit";
import { setLinkHidden } from "@/lib/links/visibility";
import { normalizeUrl } from "@/app/curated-links/utils/urlUtils";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(request: NextRequest) {
  if (
    request.headers.get("authorization") !==
    `Bearer ${process.env.ADMIN_SECRET}`
  ) {
    return err("unauthorized", "Missing or invalid admin key", 401);
  }

  const rate = await adminLimiter.limit(clientIp(request.headers));
  if (!rate.success) {
    return err("rate_limited", "Too many requests", 429);
  }

  const parsed = hideRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return err("invalid_body", "Body must be { url: string }", 400);
  }

  const found = await setLinkHidden(parsed.data.url, true);
  if (!found) {
    return err("not_found", "No link matches this URL", 404);
  }

  // Bust the ISR caches that could still show the link.
  revalidatePath("/curated-links");
  revalidatePath("/api/curated-links/latest");

  return NextResponse.json({
    data: { id: normalizeUrl(parsed.data.url), hidden: true },
  });
}
