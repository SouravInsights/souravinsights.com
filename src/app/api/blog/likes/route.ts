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
async function getTotalLikes(slugs: string[]): Promise<number> {
  const values = await Promise.all(
    slugs.map((slug) => redis.get<number>(`blog:likes:${slug}`))
  );
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

async function getUserLikes(slugs: string[], visitorId: string): Promise<number> {
  const values = await Promise.all(
    slugs.map((slug) => redis.get<number>(`blog:likes:${slug}:${visitorId}`))
  );
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const slugs = getPostSlugsForStats(slug);
    const visitorId = getVisitorId();

    const totalLikes = await getTotalLikes(slugs);
    const userLikes = await getUserLikes(slugs, visitorId);

    return NextResponse.json({ totalLikes, userLikes });
  } catch (error) {
    console.error("Error fetching likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch likes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const canonical = resolvePostSlug(slug);
    const slugs = getPostSlugsForStats(slug);
    const visitorId = getVisitorId();

    // Get current user likes across every slug this post has had
    const currentUserLikes = await getUserLikes(slugs, visitorId);

    // Check if user already reached max likes
    if (currentUserLikes >= 10) {
      return NextResponse.json(
        {
          error: "Maximum likes reached",
          totalLikes: await getTotalLikes(slugs),
          userLikes: currentUserLikes,
        },
        { status: 400 }
      );
    }

    // Increment both user likes and total likes on the current slug
    await redis.incr(`blog:likes:${canonical}:${visitorId}`);
    await redis.incr(`blog:likes:${canonical}`);

    return NextResponse.json({
      totalLikes: await getTotalLikes(slugs),
      userLikes: await getUserLikes(slugs, visitorId),
    });
  } catch (error) {
    console.error("Error updating likes:", error);
    return NextResponse.json(
      { error: "Failed to update likes" },
      { status: 500 }
    );
  }
}
