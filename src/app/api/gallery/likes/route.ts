import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import redis from "@/app/lib/redis";

/**
 * Likes for the Gallery page, shaped exactly like the insights/blog like APIs
 * so all three can share `useLikes` and `LikeButton`.
 *
 * Storage (Upstash Redis):
 *   gallery:likes          hash of videoId -> total likes
 *   gallery:user:{visitor} hash of videoId -> this visitor's likes for it
 *
 * A visitor may like a single video up to MAX_LIKES times. Counts only ever go
 * up, so they can never go negative.
 */

const MAX_LIKES = 10;
const VISITOR_COOKIE = "visitor_id";
const COUNTS_HASH = "gallery:likes";

const userHash = (visitorId: string) => `gallery:user:${visitorId}`;

function getVisitorId(): { id: string; isNew: boolean } {
  const existing = cookies().get(VISITOR_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: uuidv4(), isNew: true };
}

function withVisitorCookie(
  response: NextResponse,
  visitorId: string,
  isNew: boolean
) {
  if (isNew) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const videoId = new URL(request.url).searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const { id: visitorId, isNew } = getVisitorId();

    const [total, mine] = await Promise.all([
      redis.hget<number>(COUNTS_HASH, videoId),
      redis.hget<number>(userHash(visitorId), videoId),
    ]);

    const response = NextResponse.json({
      totalLikes: total ?? 0,
      userLikes: mine ?? 0,
    });
    return withVisitorCookie(response, visitorId, isNew);
  } catch (error) {
    console.error("Error fetching gallery likes:", error);
    return NextResponse.json(
      { error: "Failed to fetch likes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const { id: visitorId, isNew } = getVisitorId();
    const key = userHash(visitorId);
    const mine = (await redis.hget<number>(key, videoId)) ?? 0;

    if (mine >= MAX_LIKES) {
      return NextResponse.json(
        {
          error: "Maximum likes reached",
          totalLikes: (await redis.hget<number>(COUNTS_HASH, videoId)) ?? 0,
          userLikes: mine,
        },
        { status: 400 }
      );
    }

    // Both counters only ever go up.
    const [total, nextMine] = await Promise.all([
      redis.hincrby(COUNTS_HASH, videoId, 1),
      redis.hincrby(key, videoId, 1),
    ]);

    const response = NextResponse.json({
      totalLikes: total,
      userLikes: nextMine,
    });
    return withVisitorCookie(response, visitorId, isNew);
  } catch (error) {
    console.error("Error updating gallery likes:", error);
    return NextResponse.json(
      { error: "Failed to update like" },
      { status: 500 }
    );
  }
}
