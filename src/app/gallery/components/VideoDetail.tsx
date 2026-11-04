"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { ArrowUpRight, Clock, Play, X } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { useFeedback } from "@/hooks/useFeedback";
import { useGalleryViews } from "@/hooks/useGalleryViews";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GalleryProject, GalleryVideo } from "../gallery-data";
import { formatTime, VideoPlayer } from "./VideoPlayer";

interface VideoDetailProps {
  video: GalleryVideo;
  project: GalleryProject;
  initialLikes: number;
  initialViews: number;
  onClose: () => void;
  /** Report changed totals back to the grid so its tile stays in step. */
  onLikeChange: (total: number) => void;
  onViewChange: (total: number) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

/** Drag distance or velocity past which the sheet dismisses. */
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 700;

/**
 * The detail view.
 *
 * Desktop: a centered card. Phone: a bottom sheet that can be dragged away.
 * Both are the same panel — the breakpoint only decides where it rests and
 * whether the grabber exists.
 *
 * The video frame carries the card's `layoutId`, so it grows out of the grid
 * tile it was clicked from and returns there on close. Everything else fades in
 * a beat later, which keeps the eye on the picture rather than on a panel.
 */
export function VideoDetail({
  video,
  project,
  initialLikes,
  initialViews,
  onClose,
  onLikeChange,
  onViewChange,
}: VideoDetailProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const dragControls = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);

  const { views } = useGalleryViews({
    videoId: video.id,
    initialViews,
  });

  useEffect(() => {
    onViewChange(views);
  }, [views, onViewChange]);

  const handleLikeChange = useCallback(
    (total: number) => onLikeChange(total),
    [onLikeChange]
  );

  // Lock the page behind the panel and close on Escape.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const close = () => {
    feedback.press();
    onClose();
  };

  // The shell, the grabber and the close button all arrive after the frame has
  // grown into place. Anything drawn during the morph reads as a second thing
  // moving; a beat of delay keeps the eye on the video alone.
  // The frame is on a 0.34s tween (shared with the tile). The chrome waits
  // almost all of it, so nothing reads as an empty panel the video then fills.
  const reveal = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, delay: 0.26, ease: [0.23, 1, 0.32, 1] as const };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md sm:bg-black/55"
        aria-hidden="true"
        onClick={close}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={video.title}
        className="relative flex max-h-[92svh] w-full flex-col sm:max-h-[min(92svh,56rem)] sm:max-w-3xl"
        drag={isDesktop ? false : "y"}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragSnapToOrigin
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (
            info.offset.y > DISMISS_OFFSET ||
            info.velocity.y > DISMISS_VELOCITY
          ) {
            onClose();
          }
        }}
      >
        {/* The panel's surface, as its own layer: it fades in after the video
            lands, so no opaque slab ever precedes the picture. It sits outside
            the clipping box below so its shadow is not cut off. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-t-2xl border border-border bg-background shadow-2xl shadow-black/40 sm:rounded-2xl"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl">
          {/* Phone-only grabber. It is also the drag handle, so the video and
              the notes below keep their own gestures. */}
          <motion.div
            className="relative z-10 flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing sm:hidden"
            onPointerDown={(event) => dragControls.start(event)}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reveal}
          >
            <span className="h-1 w-9 rounded-full bg-foreground/25" />
          </motion.div>

          {/* The shared element. Fixed ratio, same as the grid tile, so the
              morph is a scale and the picture never stretches. Full-bleed at
              every size — a smaller inset frame reads as a mistake, and the
              recording is one tap from fullscreen regardless. */}
          <motion.div
            layoutId={`gallery-video-${video.id}`}
            transition={{
              layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
            }}
            className="relative z-10 w-full shrink-0 overflow-hidden bg-black"
            /* Same reason as the tile: the rounding is drawn with clip-path so
               the shared-layout scale cannot flatten it mid-transition. */
            style={{
              aspectRatio: `${video.width} / ${video.height}`,
              borderRadius: 0,
              clipPath: "inset(0 round 1rem 1rem 0 0)",
            }}
          >
            <VideoPlayer
              src={video.src}
              poster={video.poster}
              hasAudio={video.hasAudio}
            />
          </motion.div>

          {/* Notes and stats, a beat behind the picture. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reveal}
            className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="px-5 pb-7 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="type-label text-faint-foreground">
                  {project.name}
                </span>
                <span
                  className="h-1 w-1 rounded-full bg-border"
                  aria-hidden="true"
                />
                <span className="type-caption text-faint-foreground">
                  {formatDate(video.recordedAt)}
                </span>
              </div>

              <h2 className="type-title mt-2">{video.title}</h2>

              <p className="type-body mt-3 max-w-2xl text-muted-foreground">
                {video.notes}
              </p>

              {video.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {video.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-foreground/5 px-2.5 py-1 type-caption text-muted-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <LikeButton
                  id={video.id}
                  endpoint="/api/gallery/likes"
                  param="videoId"
                  initialTotalLikes={initialLikes}
                  onTotalChange={handleLikeChange}
                />

                <div className="flex items-center gap-3 type-caption tabular-nums text-faint-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    {views}
                    <span className="sr-only">views</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(video.duration)}
                  </span>
                  {project.url ? (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-green-700 underline-offset-4 hover:underline dark:text-green-500"
                    >
                      Visit {project.name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </div>,
    document.body
  );
}
