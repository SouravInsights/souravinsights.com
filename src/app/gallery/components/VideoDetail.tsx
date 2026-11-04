"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Clock,
  Loader2,
  Pencil,
  Play,
  X,
} from "lucide-react";
import { EditableField } from "@/components/EditableField";
import { LikeButton } from "@/components/LikeButton";
import { apiJson } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";
import { useFeedback } from "@/hooks/useFeedback";
import { useGalleryViews } from "@/hooks/useGalleryViews";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type {
  GalleryClipPatch,
  GalleryProject,
  GalleryVideo,
} from "../gallery-types";
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
  /** Admin sees the inline editor for title, notes and tags. */
  isAdmin: boolean;
}

const formatDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

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
 *
 * For an admin the title, notes and tags become editable in place. The save is
 * a PATCH to `/api/gallery/clip` (the same admin-write shape as the rest of the
 * site), followed by a router refresh so the grid tile picks up the new title.
 */
export function VideoDetail({
  video,
  project,
  initialLikes,
  initialViews,
  onClose,
  onLikeChange,
  onViewChange,
  isAdmin,
}: VideoDetailProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const dragControls = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);
  const savedTimer = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { views } = useGalleryViews({
    videoId: video.id,
    initialViews,
  });

  // The editable copy of the clip's words. Kept local so typing never waits on
  // the network; the server is told on blur.
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [notes, setNotes] = useState(video.notes);
  const [tags, setTags] = useState(video.tags);
  const [tagsText, setTagsText] = useState(video.tags.join(", "));
  const [sound, setSound] = useState(video.sound);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  useEffect(() => {
    onViewChange(views);
  }, [views, onViewChange]);

  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    []
  );

  const handleLikeChange = useCallback(
    (total: number) => onLikeChange(total),
    [onLikeChange]
  );

  const persist = useCallback(
    async (patch: GalleryClipPatch) => {
      setSaveState("saving");
      try {
        await apiJson("/api/gallery/clip", {
          method: "PATCH",
          body: JSON.stringify({ id: video.id, ...patch }),
        });
        setSaveState("saved");
        // Refetch the one read, so the grid tile behind the panel shows the
        // new title without a page reload.
        queryClient.invalidateQueries({ queryKey: qk.gallery() });
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setSaveState("idle"), 1600);
      } catch {
        setSaveState("idle");
      }
    },
    [video.id, queryClient]
  );

  const handleTitle = (value: string) => {
    setTitle(value);
    void persist({ title: value });
  };

  const handleNotes = (value: string) => {
    setNotes(value);
    void persist({ notes: value });
  };

  const handleSound = (next: boolean) => {
    setSound(next);
    void persist({ sound: next });
  };

  const commitTags = useCallback(() => {
    const next = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (next.join("|") === tags.join("|")) return;
    setTags(next);
    setTagsText(next.join(", "));
    void persist({ tags: next });
  }, [tagsText, tags, persist]);

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
    // An open field saves as the click blurs it; tags have no blur of their own,
    // so they are committed here too.
    commitTags();
    feedback.press();
    onClose();
  };

  // The frame is on a 0.34s tween (shared with the tile). The chrome waits
  // almost all of it, so nothing reads as an empty panel the video then fills.
  const reveal = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, delay: 0.26, ease: [0.23, 1, 0.32, 1] as const };

  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

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
        aria-label={title}
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
          className="pointer-events-none absolute inset-0 rounded-t-lg border border-border bg-background shadow-2xl shadow-black/40 sm:rounded-lg"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg sm:rounded-lg">
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
              clipPath: "inset(0 round 0.5rem 0.5rem 0 0)",
            }}
          >
            <VideoPlayer
              src={video.src}
              poster={video.poster}
              sound={sound}
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
                {video.recordedAt ? (
                  <>
                    <span
                      className="h-1 w-1 rounded-full bg-border"
                      aria-hidden="true"
                    />
                    <span className="type-caption text-faint-foreground">
                      {formatDate(video.recordedAt)}
                    </span>
                  </>
                ) : null}

                <AnimatePresence>
                  {saveState !== "idle" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto inline-flex items-center gap-1 type-caption text-faint-foreground"
                    >
                      {saveState === "saving" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 text-green-700 dark:text-green-500" />
                      )}
                      {saveState === "saving" ? "Saving" : "Saved"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {editing ? (
                <>
                  <EditableField
                    as="h2"
                    value={title}
                    onChange={handleTitle}
                    isEditing
                    placeholder="Title"
                    className="type-title mt-2 block"
                  />
                  <EditableField
                    as="p"
                    value={notes}
                    onChange={handleNotes}
                    isEditing
                    multiline
                    placeholder="Notes"
                    className="type-body mt-3 block max-w-2xl text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(event) => setTagsText(event.target.value)}
                    onBlur={commitTags}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    placeholder="Tags, comma separated"
                    spellCheck={false}
                    aria-label="Tags"
                    className="mt-4 h-9 w-full max-w-md rounded-lg border border-border bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sound}
                      aria-label="Play with sound"
                      onClick={() => handleSound(!sound)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        sound ? "bg-green-600" : "bg-foreground/15"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          sound ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <span className="type-caption text-muted-foreground">
                      Play with sound
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="type-title mt-2">{title}</h2>
                  <p className="type-body mt-3 max-w-2xl text-muted-foreground">
                    {notes}
                  </p>
                  {tags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full bg-foreground/5 px-2.5 py-1 type-caption text-muted-foreground"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
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

        {isAdmin && (
          <motion.button
            type="button"
            onClick={() => {
              feedback.select();
              if (editing) commitTags();
              setEditing((value) => !value);
            }}
            aria-pressed={editing}
            aria-label={editing ? "Done editing" : "Edit clip"}
            title={editing ? "Done editing" : "Edit title, notes and tags"}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reveal}
            className={`absolute right-14 top-3 z-30 sm:right-16 sm:top-4 ${iconButton} ${
              editing
                ? "bg-white text-black"
                : "bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-sm hover:bg-black/65"
            }`}
          >
            {editing ? (
              <Check className="h-4 w-4" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </motion.button>
        )}

        <motion.button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
          className={`absolute right-3 top-3 z-30 sm:right-4 sm:top-4 ${iconButton} bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-black/65`}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </div>,
    document.body
  );
}
