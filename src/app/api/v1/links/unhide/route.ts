import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hideRequestSchema } from "@/lib/links/api-schemas";
import { adminLimiter, clientIp } from "@/lib/links/ratelimit";
import { setLinkHidden, setLinksHidden } from "@/lib/links/visibility";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";

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
    return err("invalid_body", "Body must be { url } or { urls: [...] }", 400);
  }

  const { url, urls } = parsed.data;

  // Batch form: the undo path after a clean-up.
  if (urls) {
    const count = await setLinksHidden(urls, false);
    revalidatePath("/insights");
    revalidatePath("/api/insights/latest");
    return NextResponse.json({
      data: { urls: urls.map(normalizeUrl), hidden: false, count },
    });
  }

  if (!url) {
    return err("invalid_body", "Body must be { url } or { urls: [...] }", 400);
  }

  const found = await setLinkHidden(url, false);
  if (!found) {
    return err("not_found", "No link matches this URL", 404);
  }

  revalidatePath("/insights");
  revalidatePath("/api/insights/latest");

  return NextResponse.json({
    data: { id: normalizeUrl(url), hidden: false },
  });
}
