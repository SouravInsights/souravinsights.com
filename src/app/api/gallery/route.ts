import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { galleryProjects, galleryVideos } from "@/db/schema";
import redis from "@/app/lib/redis";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { GalleryPayload } from "@/app/gallery/gallery-types";

const R2_BASE = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
const publicUrl = (key: string) => `${R2_BASE}/${key}`;

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
      hasAudio: video.hasAudio,
      tags: video.tags ?? [],
      recordedAt: video.recordedAt ?? "",
    })),
    likes: toCounts(likes),
    views: toCounts(views),
    isAdmin,
  };

  return NextResponse.json(payload);
}
