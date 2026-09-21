import { NextRequest, NextResponse } from "next/server";
import redis from "@/app/lib/redis";
import {
  countComments,
  HnAuthorInfo,
  HnComment,
  HnThread,
  parseHnHtml,
} from "@/app/blog/utils/hnUtils";

// The Algolia HN API returns the entire comment tree in a single request,
// which is far cheaper than walking the official Firebase API's `kids` lists.
const ALGOLIA_ITEM_URL = "https://hn.algolia.com/api/v1/items";
// Same provider, and far lighter than Firebase's user endpoint, which ships the
// user's entire `submitted` list (hundreds of KB). Algolia returns ~700 bytes.
const ALGOLIA_USER_URL = "https://hn.algolia.com/api/v1/users";
const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes
const USER_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// Bump when the cached thread shape changes so stale entries from an older
// deploy are ignored instead of served.
const CACHE_VERSION = "v2";

// Karma requires one user lookup per unique author. Cap how many we fetch
// for a single thread so a 1000-comment front-page thread stays bounded, and
// keep the per-user cache long-lived so repeat visits are nearly free.
const MAX_AUTHORS_PER_THREAD = 150;
const AUTHOR_FETCH_CONCURRENCY = 10;

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

function collectAuthors(
  comments: HnComment[],
  authors = new Set<string>()
): Set<string> {
  for (const comment of comments) {
    authors.add(comment.author);
    collectAuthors(comment.children, authors);
  }
  return authors;
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  for (let index = 0; index < items.length; index += limit) {
    await Promise.all(items.slice(index, index + limit).map(worker));
  }
}

/**
 * Look up karma for each unique commenter from the Algolia user endpoint.
 * Reads/writes a long-lived per-user Redis cache, then fetches misses.
 * Best-effort: a failed lookup yields `karma: null` rather than breaking the
 * thread. Missing users return HTTP 500 from Algolia, which we treat as null.
 */
async function fetchAuthorInfo(
  usernames: string[]
): Promise<Record<string, HnAuthorInfo>> {
  const authors: Record<string, HnAuthorInfo> = {};
  const missing: string[] = [];

  await Promise.all(
    usernames.slice(0, MAX_AUTHORS_PER_THREAD).map(async (username) => {
      try {
        const cached = await redis.get<HnAuthorInfo>(`hn:user:${username}`);
        if (cached) authors[username] = cached;
        else missing.push(username);
      } catch {
        missing.push(username);
      }
    })
  );

  await withConcurrency(missing, AUTHOR_FETCH_CONCURRENCY, async (username) => {
    try {
      const response = await fetch(
        `${ALGOLIA_USER_URL}/${encodeURIComponent(username)}`,
        { next: { revalidate: USER_CACHE_TTL_SECONDS } }
      );
      if (!response.ok) throw new Error(`Algolia responded ${response.status}`);

      const data = (await response.json()) as { karma?: number } | null;

      const info: HnAuthorInfo = {
        karma: typeof data?.karma === "number" ? data.karma : null,
      };
      authors[username] = info;

      try {
        await redis.set(`hn:user:${username}`, info, {
          ex: USER_CACHE_TTL_SECONDS,
        });
      } catch (error) {
        console.warn("HN user cache write failed:", error);
      }
    } catch (error) {
      console.warn(`Failed to fetch HN user ${username}:`, error);
      authors[username] = { karma: null };
    }
  });

  return authors;
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

  const cacheKey = `hn:thread:${CACHE_VERSION}:${id}`;

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
    const authors = await fetchAuthorInfo(Array.from(collectAuthors(comments)));

    const thread: HnThread = {
      id,
      title: data.title || "",
      points: data.points ?? null,
      author: data.author ?? null,
      createdAt: data.created_at,
      commentCount: countComments(comments),
      hnUrl: `https://news.ycombinator.com/item?id=${id}`,
      comments,
      authors,
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