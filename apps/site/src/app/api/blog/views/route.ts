import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";
import { getPostSlugsForStats, resolvePostSlug } from "@/lib/post-aliases";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// Helper to get or set visitor ID
function getVisitorId(): string {
  const cookieStore = cookies();
  let visitorId = cookieStore.get("visitor_id")?.value;

  if (!visitorId) {
    visitorId = uuidv4();
  }

  return visitorId;
}

// A post keeps its stats across renames, so a total is the sum over every slug
// it has answered on. See `src/lib/post-aliases.ts`.
async function getTotalViews(slugs: string[]): Promise<number> {
  const values = await Promise.all(
    slugs.map((slug) => redis.get<number>(`blog:views:${slug}`))
  );
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

async function hasViewedAny(slugs: string[], visitorId: string): Promise<boolean> {
  const values = await Promise.all(
    slugs.map((slug) => redis.get(`blog:views:${slug}:${visitorId}`))
  );
  return values.some(Boolean);
}

// Get view count for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const views = await getTotalViews(getPostSlugsForStats(slug));
    return NextResponse.json({ views });
  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json(
      { error: "Failed to fetch views" },
      { status: 500 }
    );
  }
}

// Increment view count for a post (only once per visitor per post)
export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const canonical = resolvePostSlug(slug);
    const slugs = getPostSlugsForStats(slug);
    const visitorId = getVisitorId();

    // Check if this visitor has already viewed this post under any of its slugs
    const hasViewed = await hasViewedAny(slugs, visitorId);

    if (!hasViewed) {
      // Increment the count on the current slug
      await redis.incr(`blog:views:${canonical}`);
      // Mark this visitor as having viewed this post (expire after 24 hours for unique daily views)
      await redis.set(`blog:views:${canonical}:${visitorId}`, 1, { ex: 86400 }); // 24 hours
    }

    const views = await getTotalViews(slugs);
    return NextResponse.json({ views });
  } catch (error) {
    console.error("Error updating views:", error);
    return NextResponse.json(
      { error: "Failed to update views" },
      { status: 500 }
    );
  }
}
