import { NextRequest, NextResponse } from "next/server";
import { generatePreview } from "@/lib/link-preview";

// Headless capture needs room to run; on Vercel this route should be allowed
// well past the default. Also keeps it on the Node.js runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");

  if (!target || !/^https?:\/\//i.test(target)) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    // Cached links resolve instantly; misses capture once and are stored.
    const preview = await generatePreview(target);

    // The grid warms previews and needs the stored URL back, so it asks for
    // JSON; the image itself can use the redirect directly.
    if (request.nextUrl.searchParams.get("json") === "1") {
      return NextResponse.json({ preview });
    }

    return NextResponse.redirect(preview, 307);
  } catch (error) {
    console.error("link-preview failed", target, error);
    return new NextResponse("Preview unavailable", { status: 502 });
  }
}