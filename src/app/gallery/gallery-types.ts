/**
 * The gallery's shapes. The content itself lives in Postgres
 * (`gallery_projects`, `gallery_videos`) — see `src/db/schema.ts` — so the
 * open-source repo carries no clips, no bucket layout and no copy. Only these
 * types and the code that reads them.
 */

export interface GalleryProject {
  /** Stable key, also the R2 folder name. */
  key: string;
  name: string;
  url?: string;
}

/** A clip as the UI needs it: DB row + derived public URLs. */
export interface GalleryVideo {
  id: string;
  title: string;
  /** A `GalleryProject.key`. */
  project: string;
  notes: string;
  /** Fully-qualified public URL, derived from the R2 base and `video_key`. */
  src: string;
  poster: string;
  /** Intrinsic video dimensions, so the frame reserves its space. */
  width: number;
  height: number;
  /** Seconds. Shown before the video loads. */
  duration: number;
  /** Whether the file has an audio track worth a mute control. */
  sound: boolean;
  tags: string[];
  /** ISO date (`YYYY-MM-DD`) the interaction was recorded. */
  recordedAt: string;
}

/** What a save may change. Everything else is a fact about the uploaded file. */
export interface GalleryClipPatch {
  title?: string;
  notes?: string;
  tags?: string[];
  /** Play this clip with its sound on. */
  sound?: boolean;
}

/** The whole `GET /api/gallery` response. */
export interface GalleryPayload {
  projects: GalleryProject[];
  videos: GalleryVideo[];
  /** video id → total likes. */
  likes: Record<string, number>;
  /** video id → total views. */
  views: Record<string, number>;
  /** Whether the caller carries an admin session, for showing the editor. */
  isAdmin: boolean;
  /** Seed for the five-minute shuffle, so the order is not always the same. */
  shuffleSeed: number;
}
