"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Clock, Play } from "@phosphor-icons/react";
import { DetailSheet } from "@/components/DetailSheet";
import { EditableField } from "@/components/EditableField";
import { LikeButton } from "@/components/LikeButton";
import { apiJson } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";
import { useGalleryViews } from "@/hooks/useGalleryViews";
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

/**
 * A clip's detail view. The shell is `DetailSheet`; this file only supplies the
 * clip's media, its words and the admin save.
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

  // An open field saves as the click blurs it; tags have no blur of their own,
  // so they are committed on every close path.
  const close = useCallback(() => {
    commitTags();
    onClose();
  }, [commitTags, onClose]);

  const toggleEdit = useCallback(() => {
    if (editing) commitTags();
    setEditing((value) => !value);
  }, [editing, commitTags]);

  return (
    <DetailSheet
      label={title}
      onClose={close}
      isAdmin={isAdmin}
      editing={editing}
      onToggleEdit={toggleEdit}
      saveState={saveState}
      layoutId={`gallery-video-${video.id}`}
      mediaClassName="w-full"
      mediaStyle={{ aspectRatio: `${video.width} / ${video.height}` }}
      media={<VideoPlayer src={video.src} poster={video.poster} sound={sound} />}
      meta={
        <>
          <span className="type-label text-faint-foreground">{project.name}</span>
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
        </>
      }
    >
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
    </DetailSheet>
  );
}
