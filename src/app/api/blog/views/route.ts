import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";
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

// Get view count for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const views = (await redis.get<number>(`blog:views:${slug}`)) || 0;
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

    const visitorId = getVisitorId();
    const viewKey = `blog:views:${slug}`;
    const visitorViewKey = `blog:views:${slug}:${visitorId}`;

    // Check if this visitor has already viewed this post
    const hasViewed = await redis.get(visitorViewKey);

    if (!hasViewed) {
      // Increment the view count
      await redis.incr(viewKey);
      // Mark this visitor as having viewed this post (expire after 24 hours for unique daily views)
      await redis.set(visitorViewKey, 1, { ex: 86400 }); // 24 hours
    }

    const views = (await redis.get<number>(viewKey)) || 0;
    return NextResponse.json({ views });
  } catch (error) {
    console.error("Error updating views:", error);
    return NextResponse.json(
      { error: "Failed to update views" },
      { status: 500 }
    );
  }
}
