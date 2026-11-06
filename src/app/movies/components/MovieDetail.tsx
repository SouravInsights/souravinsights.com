"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  CircleNotch,
  FilmStrip,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { DetailSheet } from "@/components/DetailSheet";
import { EditableField } from "@/components/EditableField";
import { generateId, type MovieEntry } from "@/types/movies";
import { uploadPoster } from "../actions";

interface MovieDetailProps {
  movie: MovieEntry;
  isAdmin: boolean;
  saveState: "idle" | "saving" | "saved";
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MovieEntry>) => void;
  onDelete: (id: string) => void;
}

/**
 * A film's detail view. The shell is `DetailSheet`; this file only supplies the
 * poster, the words and the admin save.
 */
export function MovieDetail({
  movie,
  isAdmin,
  saveState,
  onClose,
  onUpdate,
  onDelete,
}: MovieDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadPoster(formData);

        if (res.success && res.url) {
          onUpdate(movie.id, { posterData: res.url });
        } else {
          alert("Failed to upload image: " + (res.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload image.");
      } finally {
        setIsUploadingImage(false);
      }
      e.target.value = "";
    },
    [movie.id, onUpdate]
  );

  const addQuote = () => {
    onUpdate(movie.id, {
      quotes: [...movie.quotes, { id: generateId(), text: "" }],
    });
  };

  const updateQuote = (quoteId: string, text: string) => {
    onUpdate(movie.id, {
      quotes: movie.quotes.map((q) => (q.id === quoteId ? { ...q, text } : q)),
    });
  };

  const deleteQuote = (quoteId: string) => {
    onUpdate(movie.id, {
      quotes: movie.quotes.filter((q) => q.id !== quoteId),
    });
  };

  return (
    <DetailSheet
      label={movie.title}
      onClose={onClose}
      isAdmin={isAdmin}
      editing={editing}
      onToggleEdit={() => setEditing((value) => !value)}
      saveState={saveState}
      layoutId={`movie-poster-${movie.id}`}
      /* The tile is 2:3, so the shared-layout travel is a pure scale. */
      mediaClassName="h-[38svh] w-auto aspect-[2/3] sm:h-[52svh]"
      /* No radius of its own. The sheet and the media band are the containers,
         so they round; the image inside is content and stays square. */
      mediaStyle={{ clipPath: "none" }}
      mediaBackdrop={
        <div className="h-full w-full bg-black">
          {movie.posterData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterData}
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-110 object-cover opacity-60 blur-2xl"
            />
          )}
        </div>
      }
      media={
        isUploadingImage ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <CircleNotch className="h-6 w-6 animate-spin text-white/70" />
            <span className="type-caption px-4 text-center text-white/70">
              Uploading…
            </span>
          </div>
        ) : movie.posterData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.posterData}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <FilmStrip className="h-6 w-6 text-white/50" />
            <span className="type-caption px-4 text-center text-white/60">
              No poster
            </span>
          </div>
        )
      }
    >
      <EditableField
        as="h2"
        value={movie.title}
        onChange={(val) => onUpdate(movie.id, { title: val })}
        isEditing={editing}
        placeholder="Film title"
        className="type-title mt-2 block"
      />

      {(editing || movie.notes) && (
        <EditableField
          as="p"
          value={movie.notes}
          onChange={(val) => onUpdate(movie.id, { notes: val })}
          isEditing={editing}
          multiline
          placeholder="Notes"
          className="type-body mt-3 block max-w-2xl text-muted-foreground"
        />
      )}

      {movie.quotes.length > 0 && (
        <ul className="mt-5 space-y-3">
          {movie.quotes.map((quote) => (
            <li
              key={quote.id}
              className="group/quote relative border-l border-border pl-4"
            >
              {editing && (
                <button
                  type="button"
                  onClick={() => deleteQuote(quote.id)}
                  aria-label="Remove line"
                  className="absolute -left-2.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover/quote:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <EditableField
                as="p"
                value={quote.text}
                onChange={(val) => updateQuote(quote.id, val)}
                isEditing={editing}
                multiline
                placeholder="A line that stayed with you…"
                className="type-body block text-foreground/85"
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <button
          type="button"
          onClick={addQuote}
          className="mt-4 text-sm font-medium text-green-700 transition-colors hover:text-green-800 dark:text-green-500 dark:hover:text-green-400"
        >
          + Add line
        </button>
      )}

      {editing && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <UploadSimple className="h-3.5 w-3.5" />
            {movie.posterData ? "Replace poster" : "Add poster"}
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(movie.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive/60 transition-colors hover:text-destructive"
          >
            <Trash className="h-3.5 w-3.5" />
            Remove film
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </DetailSheet>
  );
}
