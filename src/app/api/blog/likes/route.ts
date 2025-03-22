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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Get total likes for the post
    const totalLikes = (await redis.get<number>(`blog:likes:${slug}`)) || 0;

    // Get user likes for this visitor
    const visitorId = getVisitorId();
    const userLikes =
      (await redis.get<number>(`blog:likes:${slug}:${visitorId}`)) || 0;

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

    const visitorId = getVisitorId();
    const userLikesKey = `blog:likes:${slug}:${visitorId}`;
    const totalLikesKey = `blog:likes:${slug}`;

    // Get current user likes
    const currentUserLikes = (await redis.get<number>(userLikesKey)) || 0;

    // Check if user already reached max likes
    if (currentUserLikes >= 10) {
      return NextResponse.json(
        {
          error: "Maximum likes reached",
          totalLikes: (await redis.get<number>(totalLikesKey)) || 0,
          userLikes: currentUserLikes,
        },
        { status: 400 }
      );
    }

    // Increment both user likes and total likes
    const newUserLikes = await redis.incr(userLikesKey);
    const newTotalLikes = await redis.incr(totalLikesKey);

    return NextResponse.json({
      totalLikes: newTotalLikes,
      userLikes: newUserLikes,
    });
  } catch (error) {
    console.error("Error updating likes:", error);
    return NextResponse.json(
      { error: "Failed to update likes" },
      { status: 500 }
    );
  }
}
