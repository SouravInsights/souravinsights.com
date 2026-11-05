import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { galleryProjects, galleryVideos } from "@/db/schema";
import redis from "@/app/lib/redis";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { GalleryPayload } from "@/app/gallery/gallery-types";

const R2_BASE = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

/**
 * Cache-busting version for the media URLs.
 *
 * Bump this whenever a file is replaced under the same R2 key. The first
 * uploads were served with `Cache-Control: immutable`, so a device that has
 * one never revalidates — a phone cannot hard-refresh, and only a URL change
 * reaches it. Uploads now use a one-hour cache, so a bump is needed only when
 * a replacement has to land immediately.
 */
const MEDIA_VERSION = 2;

const publicUrl = (key: string) => `${R2_BASE}/${key}?v=${MEDIA_VERSION}`;

const toCounts = (raw: Record<string, number> | null): Record<string, number> =>
  Object.fromEntries(
    Object.entries(raw ?? {}).map(([id, value]) => [id, Number(value) || 0])
  );

/**
 * The gallery read. One request returns everything the page needs — projects,
 * clips, and the like/view totals — so the grid makes a single call.
 *
 * `isAdmin` is resolved from the session cookie (same origin), which is what
 * tells the client whether to offer the inline editor. It authorises nothing:
 * the write below still checks the session for real.
 */
export async function GET() {
  const isAdmin = isAdminAuthenticated();

  const [projects, videos, likes, views] = await Promise.all([
    db
      .select()
      .from(galleryProjects)
      .orderBy(asc(galleryProjects.position), asc(galleryProjects.key)),
    db
      .select()
      .from(galleryVideos)
      .orderBy(asc(galleryVideos.position), asc(galleryVideos.id)),
    redis.hgetall<Record<string, number>>("gallery:likes"),
    redis.hgetall<Record<string, number>>("gallery:views"),
  ]);

  const payload: GalleryPayload = {
    projects: projects.map((project) => ({
      key: project.key,
      name: project.name,
      url: project.url ?? undefined,
    })),
    videos: videos.map((video) => ({
      id: video.id,
      title: video.title,
      project: video.project,
      notes: video.notes,
      src: publicUrl(video.videoKey),
      poster: publicUrl(video.posterKey),
      width: video.width,
      height: video.height,
      duration: video.duration,
      sound: video.sound,
      tags: video.tags ?? [],
      recordedAt: video.recordedAt ?? "",
    })),
    likes: toCounts(likes),
    views: toCounts(views),
    isAdmin,
    // A new order every five minutes, the same window the insights list uses.
    // Stable within the window so a reload does not jump, different across it
    // so the same first few clips are not the only ones anyone sees.
    shuffleSeed: Math.floor(Date.now() / (5 * 60 * 1000)),
  };

  return NextResponse.json(payload);
}
