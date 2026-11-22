import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import redis from "@/app/lib/redis";

/**
 * Views for the Gallery page.
 *
 * Storage (Upstash Redis):
 *   gallery:views                     hash of videoId -> total views
 *   gallery:viewed:{visitor}:{video}  a string marker, TTL 24h
 *
 * A view is counted once per visitor per video per day. The marker is a plain
 * key rather than a hash field because Redis cannot expire a single field, and
 * an expiring key is the smallest honest way to say "seen recently".
 */

const VISITOR_COOKIE = "visitor_id";
const VIEWS_HASH = "gallery:views";
const VIEW_TTL_SECONDS = 60 * 60 * 24;

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

    const views = (await redis.hget<number>(VIEWS_HASH, videoId)) ?? 0;
    return NextResponse.json({ views });
  } catch (error) {
    console.error("Error fetching gallery views:", error);
    return NextResponse.json(
      { error: "Failed to fetch views" },
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
    const marker = `gallery:viewed:${visitorId}:${videoId}`;
    const seen = await redis.get(marker);

    if (!seen) {
      await Promise.all([
        redis.hincrby(VIEWS_HASH, videoId, 1),
        redis.set(marker, 1, { ex: VIEW_TTL_SECONDS }),
      ]);
    }

    const views = (await redis.hget<number>(VIEWS_HASH, videoId)) ?? 0;
    const response = NextResponse.json({ views });
    return withVisitorCookie(response, visitorId, isNew);
  } catch (error) {
    console.error("Error updating gallery views:", error);
    return NextResponse.json(
      { error: "Failed to update views" },
      { status: 500 }
    );
  }
}
