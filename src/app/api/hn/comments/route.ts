import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";
import {
  countComments,
  HnComment,
  HnThread,
  parseHnHtml,
} from "@/app/blog/utils/hnUtils";

// The Algolia HN API returns the entire comment tree in a single request,
// which is far cheaper than walking the official Firebase API's `kids` lists.
const ALGOLIA_ITEM_URL = "https://hn.algolia.com/api/v1/items";
const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes

interface AlgoliaItem {
  id: number;
  author: string | null;
  created_at: string;
  created_at_i?: number;
  text: string | null;
  title: string | null;
  points: number | null;
  type: string | null;
  children?: AlgoliaItem[];
}

function normalizeComments(items: AlgoliaItem[] | undefined): HnComment[] {
  if (!items || items.length === 0) return [];

  const comments: HnComment[] = [];

  for (const item of items) {
    if (item.type && item.type !== "comment") continue;

    const children = normalizeComments(item.children);
    const text = item.text?.trim();

    // Deleted / empty comments carry no content of their own. Hoist their
    // replies up so the discussion stays readable instead of showing holes.
    if (!text) {
      comments.push(...children);
      continue;
    }

    comments.push({
      id: item.id,
      author: item.author || "anonymous",
      createdAt: item.created_at,
      blocks: parseHnHtml(text),
      children,
      replyUrl: `https://news.ycombinator.com/reply?id=${item.id}`,
    });
  }

  return comments;
}

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const id = Number(idParam);

  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "A valid Hacker News item id is required" },
      { status: 400 }
    );
  }

  const cacheKey = `hn:thread:${id}`;

  try {
    const cached = await redis.get<HnThread>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      });
    }
  } catch (error) {
    // Redis is best-effort; never let a cache failure break the endpoint.
    console.warn("HN comments cache read failed:", error);
  }

  try {
    const response = await fetch(`${ALGOLIA_ITEM_URL}/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: CACHE_TTL_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Algolia responded with ${response.status}`);
    }

    const data = (await response.json()) as AlgoliaItem;
    const comments = normalizeComments(data.children);

    const thread: HnThread = {
      id,
      title: data.title || "",
      points: data.points ?? null,
      author: data.author ?? null,
      createdAt: data.created_at,
      commentCount: countComments(comments),
      hnUrl: `https://news.ycombinator.com/item?id=${id}`,
      comments,
    };

    try {
      await redis.set(cacheKey, thread, { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      console.warn("HN comments cache write failed:", error);
    }

    return NextResponse.json(thread, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Failed to fetch Hacker News thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch Hacker News comments" },
      { status: 502 }
    );
  }
}