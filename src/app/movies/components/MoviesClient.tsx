"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup } from "framer-motion";
import {
  MoviesData,
  MovieEntry,
  emptyMovie,
  generateId,
  normalizeMoviesData,
} from "@/types/movies";
import { EditableField } from "@/components/EditableField";
import { SavePill } from "@/components/SavePill";
import { saveMoviesData } from "../actions";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import type { Draggable } from "@dnd-kit/dom";
import { FilmStrip, Plus } from "@phosphor-icons/react";
import { MovieCard } from "./MovieCard";
import { MovieDetail } from "./MovieDetail";

type DraggableType = Draggable | null;

interface MoviesClientProps {
  initialData: MoviesData;
  isEditing: boolean;
}

export function MoviesClient({
  initialData,
  isEditing: isUserAuthenticated,
}: MoviesClientProps) {
  const [data, setData] = useState<MoviesData>(() =>
    normalizeMoviesData(initialData)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const isEditing = isUserAuthenticated;
  const selectedMovie = selectedId
    ? data.movies.find((m) => m.id === selectedId) ?? null
    : null;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isEditing) return;

    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const res = await saveMoviesData(data);
      if (!res.success) {
        alert("Failed to save: " + res.error);
        setSaveStatus("idle");
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, isEditing]);

  const updateHeader = (key: keyof MoviesData["header"], value: string) => {
    setData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  const updateMovie = (id: string, updates: Partial<MovieEntry>) => {
    setData((prev) => ({
      ...prev,
      movies: prev.movies.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const deleteMovie = (id: string) => {
    setData((prev) => ({
      ...prev,
      movies: prev.movies.filter((m) => m.id !== id),
    }));
  };

  const addMovie = () => {
    const id = generateId();
    setData((prev) => ({
      ...prev,
      movies: [...prev.movies, emptyMovie(id)],
    }));
    setSelectedId(id);
  };

  const handleDragEnd = (event: {
    operation: { source: DraggableType };
    canceled: boolean;
  }) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (isSortable(source)) {
      const { initialIndex, index } = source;
      if (initialIndex !== index) {
        setData((prev) => {
          const newMovies = [...prev.movies];
          const [removed] = newMovies.splice(initialIndex, 1);
          newMovies.splice(index, 0, removed);
          return { ...prev, movies: newMovies };
        });
      }
    }
  };

  return (
    <LayoutGroup>
      <div className="relative bg-background text-foreground selection:bg-primary/20">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-6 sm:pt-8">
          <header className="mb-6">
            <div className="flex items-center justify-between gap-6">
              <EditableField
                as="h1"
                value={data.header.title}
                onChange={(val) => updateHeader("title", val)}
                isEditing={isEditing}
                placeholder="Page title"
                className="type-display"
              />
              {data.movies.length > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 type-caption tabular-nums">
                  <span className="font-medium text-foreground">
                    {data.movies.length}
                  </span>
                  <span className="text-faint-foreground">
                    {data.movies.length === 1 ? "film" : "films"}
                  </span>
                </span>
              )}
            </div>
            <EditableField
              as="p"
              value={data.header.description}
              onChange={(val) => updateHeader("description", val)}
              isEditing={isEditing}
              multiline
              placeholder="What this page means to you..."
              className="type-body mt-3 max-w-2xl text-muted-foreground"
            />
            <div className="rule mt-5" aria-hidden="true" />
          </header>

          {/* Film grid */}
          {data.movies.length === 0 && !isEditing ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FilmStrip className="w-8 h-8 text-faint-foreground mb-3" />
              <p className="text-sm text-faint-foreground">
                No films here yet.
              </p>
            </div>
          ) : (
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                {data.movies.map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    index={index}
                    isEditing={isEditing}
                    isActive={selectedId === movie.id}
                    onSelect={() => setSelectedId(movie.id)}
                  />
                ))}
                {isEditing && (
                  <button
                    onClick={addMovie}
                    className="aspect-[2/3] rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center gap-2 hover:border-border hover:bg-muted/20 transition-all text-faint-foreground hover:text-faint-foreground"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Add film</span>
                  </button>
                )}
              </div>
            </DragDropProvider>
          )}
        </div>

        {!selectedMovie && <SavePill state={saveStatus} />}

        {selectedMovie && (
          <MovieDetail
            key={selectedMovie.id}
            movie={selectedMovie}
            isAdmin={isEditing}
            saveState={saveStatus}
            onClose={() => setSelectedId(null)}
            onUpdate={updateMovie}
            onDelete={deleteMovie}
          />
        )}
      </div>
    </LayoutGroup>
  );
}
