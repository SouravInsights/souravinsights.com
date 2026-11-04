"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Play } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GalleryProject, GalleryVideo } from "../gallery-data";
import { formatTime } from "./VideoPlayer";

interface VideoCardProps {
  video: GalleryVideo;
  project: GalleryProject;
  likeCount: number;
  viewCount: number;
  /** True while this clip owns the open detail view. */
  isActive: boolean;
  onOpen: (video: GalleryVideo) => void;
}

/**
 * One clip in the grid.
 *
 * The frame carries the shared `layoutId`, which means only one element in the
 * tree may hold it at a time: Framer's shared-layout registry assumes the old
 * element unmounts as the new one mounts. So while the detail is open this tile
 * swaps to a plain placeholder — same box, no id — which keeps the grid's shape
 * and leaves the modal's frame as the sole owner. Keeping both mounted is what
 * made the tile come back with a corrupted (near-zero) border radius and left a
 * duplicate frame behind the modal.
 *
 * On a fine pointer the recording previews, muted, under the cursor. On touch
 * there is no hover to hang that on, so the poster and its play affordance are
 * the whole state.
 */
export function VideoCard({
  video,
  project,
  likeCount,
  viewCount,
  isActive,
  onOpen,
}: VideoCardProps) {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [previewing, setPreviewing] = useState(false);
  // Hover previews start black for a beat; the still stays until a frame lands.
  const [previewReady, setPreviewReady] = useState(false);

  // Opening the detail view takes over the clip; the inline preview must stop.
  useEffect(() => {
    if (isActive) setPreviewing(false);
  }, [isActive]);

  useEffect(() => {
    if (!previewing) setPreviewReady(false);
  }, [previewing]);

  return (
    <article>
      {isActive ? (
        <div
          aria-hidden="true"
          style={{ aspectRatio: `${video.width} / ${video.height}` }}
          className="relative block w-full overflow-hidden rounded-xl border border-border bg-secondary"
        />
      ) : (
        <motion.button
          type="button"
          layoutId={`gallery-video-${video.id}`}
          onClick={() => onOpen(video)}
          onPointerEnter={() => {
            if (canHover) setPreviewing(true);
          }}
          onPointerLeave={() => setPreviewing(false)}
          aria-label={`Open ${video.title}`}
          /* One explicit travel time for the frame, shared with the modal so both
             ends move at the same speed instead of each using a default spring. */
          transition={{
            layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
          }}
          /* Corners via `clip-path`, not `border-radius`: the shared-layout
             projection rewrites border-radius mid-scale (it collapses to a
             near-zero percentage, so the tile flashes square before settling).
             clip-path is left alone, so the rounding is correct the whole way. */
          style={{
            aspectRatio: `${video.width} / ${video.height}`,
            borderRadius: 0,
            clipPath: "inset(0 round 0.75rem)",
          }}
          className="group relative block w-full overflow-hidden bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src={video.poster}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />

          {previewing && (
            <video
              src={video.src}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              onPlaying={() => setPreviewReady(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                previewReady ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* The lift on hover, and the duration that has to stay legible on a
              white recording. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />

          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${
                previewing ? "opacity-0" : "opacity-100"
              }`}
            >
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </span>
          </span>

          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[11px] leading-none tabular-nums text-white/90 backdrop-blur-sm">
            {formatTime(video.duration)}
          </span>
        </motion.button>
      )}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-heading truncate">{video.title}</h3>
          <p className="type-caption mt-0.5 text-faint-foreground">
            {project.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-0.5 type-caption tabular-nums text-faint-foreground">
          <span className="inline-flex items-center gap-1" title="Likes">
            <Heart className="h-3.5 w-3.5" />
            {likeCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Views">
            <Play className="h-3.5 w-3.5" />
            {viewCount}
          </span>
        </div>
      </div>
    </article>
  );
}
