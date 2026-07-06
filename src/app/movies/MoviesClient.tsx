"use client";

import React, { useState, useRef, useCallback } from "react";
import { MoviesData, MovieEntry, MovieQuote, emptyMovie, generateId } from "@/types/movies";
import { EditableField } from "@/components/EditableField";
import { saveMoviesData, loginAdmin } from "./actions";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable, isSortable } from "@dnd-kit/react/sortable";
import type { Draggable } from "@dnd-kit/dom";
import {
  GripVertical,
  Eye,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  X,
  Film,
  Quote,
  Upload,
  Check,
  ExternalLink,
} from "lucide-react";

type DraggableType = Draggable | null;

const TAG_STYLES = [
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bg-red-500/10 text-red-400 border-red-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
];

function hashTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_STYLES[Math.abs(hash) % TAG_STYLES.length];
}

function SortablePoster({
  movie,
  index,
  isEditing,
  onSelect,
}: {
  movie: MovieEntry;
  index: number;
  isEditing: boolean;
  onSelect: () => void;
}) {
  const sortable = useSortable({ id: movie.id, index });

  return (
    <div
      ref={sortable.ref}
      data-dragging={sortable.isDragging || undefined}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-muted/20 border border-border/20 hover:border-border/50 transition-all cursor-pointer data-[dragging]:opacity-30 data-[dragging]:scale-95"
      onClick={onSelect}
    >
      {movie.posterData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={movie.posterData}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
          <Film className="w-6 h-6 text-muted-foreground/30 mb-2" />
          <span className="text-[11px] font-medium text-muted-foreground/60 leading-tight line-clamp-3">
            {movie.title}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[11px] font-medium text-white/90 leading-tight truncate">
          {movie.title}
        </p>
      </div>

      {isEditing && (
        <div
          ref={sortable.handleRef}
          className="absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 rounded-md bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-black/60 cursor-grab active:cursor-grabbing transition-all text-white/80"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

function MovieDialog({
  movie,
  open,
  isEditing,
  onClose,
  onUpdate,
  onDelete,
}: {
  movie: MovieEntry;
  open: boolean;
  isEditing: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MovieEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate(movie.id, { posterData: event.target?.result as string });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [movie.id, onUpdate]
  );

  const addQuote = () => {
    onUpdate(movie.id, {
      quotes: [...(movie.quotes ?? []), { id: generateId(), text: "" }],
    });
  };

  const updateQuote = (quoteId: string, text: string) => {
    onUpdate(movie.id, {
      quotes: (movie.quotes ?? []).map((q) =>
        q.id === quoteId ? { ...q, text } : q
      ),
    });
  };

  const deleteQuote = (quoteId: string) => {
    onUpdate(movie.id, {
      quotes: (movie.quotes ?? []).filter((q) => q.id !== quoteId),
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6"
      onClick={onClose}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl bg-background border border-border/40 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col sm:flex-row">
            <div className="shrink-0 w-full sm:w-48 aspect-[2/3] sm:aspect-auto sm:min-h-[320px] bg-muted/20 relative group/upload sm:sticky sm:top-0">
              {movie.posterData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={movie.posterData}
                  alt={movie.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 absolute inset-0">
                  <Film className="w-10 h-10 text-muted-foreground/15" />
                  <span className="text-[11px] text-muted-foreground/30 font-medium">
                    {movie.title || "No poster"}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center"
                >
                  <Upload className="w-6 h-6 text-white/0 hover:text-white/80 transition-all" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="flex-1 min-w-0 p-5 sm:p-6 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                  <EditableField
                    value={movie.title}
                    onChange={(val) => onUpdate(movie.id, { title: val })}
                    isEditing={isEditing}
                    placeholder="Movie title"
                  />
                </h2>
              </div>

              <div className="relative pl-5 border-l-2 border-amber-500/30">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-500/50 mb-1.5">
                  Why it stays with me
                </div>
                <div className="text-sm leading-relaxed text-muted-foreground/80">
                  <EditableField
                    value={movie.personalNote}
                    onChange={(val) => onUpdate(movie.id, { personalNote: val })}
                    isEditing={isEditing}
                    multiline
                    placeholder="What did this one do to you?"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-500/50">
                    Lines that stayed with me
                  </h3>
                  {isEditing && (
                    <button
                      onClick={addQuote}
                      className="text-[11px] font-medium text-amber-500/60 hover:text-amber-400 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {(movie.quotes?.length ?? 0) === 0 && !isEditing && (
                  <p className="text-[13px] text-muted-foreground/30 italic">
                    Haven't captured any lines yet.
                  </p>
                )}
                <div className="space-y-2">
                  {(movie.quotes ?? []).map((quote) => (
                    <div
                      key={quote.id}
                      className="group/quote relative pl-5 border-l-2 border-amber-500/30 py-1.5"
                    >
                      {isEditing && (
                        <button
                          onClick={() => deleteQuote(quote.id)}
                          className="absolute -left-2 top-1 p-0.5 rounded bg-red-500/10 opacity-0 group-hover/quote:opacity-100 hover:bg-red-500/20 transition-all text-red-400"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <div className="text-sm sm:text-base leading-relaxed text-foreground/85">
                        <Quote className="w-3 h-3 inline-block -translate-y-0.5 mr-1.5 text-amber-500/40" />
                        <EditableField
                          value={quote.text}
                          onChange={(val) => updateQuote(quote.id, val)}
                          isEditing={isEditing}
                          multiline
                          placeholder="A line that hit different..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-4 text-[13px]">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                    What it gave me
                  </h3>
                  {(movie.tags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {movie.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${hashTagColor(tag)}`}
                        >
                          {tag
                            .split("-")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                          {isEditing && (
                            <button
                              onClick={() =>
                                onUpdate(movie.id, {
                                  tags: (movie.tags ?? []).filter(
                                    (t) => t !== tag
                                  ),
                                })
                              }
                              className="hover:text-foreground transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    !isEditing && (
                      <p className="text-[11px] text-muted-foreground/30 italic">
                        Not tagged yet.
                      </p>
                    )
                  )}
                  {isEditing && (
                    <input
                      type="text"
                      placeholder="e.g. perspective-shift, devastating (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const trimmed = e.currentTarget.value
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "-");
                          if (
                            trimmed &&
                            !(movie.tags ?? []).includes(trimmed)
                          ) {
                            onUpdate(movie.id, {
                              tags: [...(movie.tags ?? []), trimmed],
                            });
                          }
                          e.currentTarget.value = "";
                        }
                      }}
                      className="w-full text-[11px] bg-transparent outline-none border-b border-transparent focus:border-border/30 py-0.5 placeholder:text-muted-foreground/30 text-muted-foreground/60"
                    />
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                    Down the rabbit hole
                  </h3>
                  {(movie.links?.length ?? 0) === 0 && !isEditing && (
                    <p className="text-[11px] text-muted-foreground/30 italic">
                      Haven't gone down this one yet.
                    </p>
                  )}
                  <div className="space-y-1">
                    {(movie.links ?? []).map((link) => (
                      <div key={link.id} className="group/link relative">
                        {isEditing && (
                          <button
                            onClick={() =>
                              onUpdate(movie.id, {
                                links: (movie.links ?? []).filter(
                                  (l) => l.id !== link.id
                                ),
                              })
                            }
                            className="absolute -left-1 top-0.5 p-0.5 rounded bg-red-500/10 opacity-0 group-hover/link:opacity-100 hover:bg-red-500/20 transition-all text-red-400"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        )}
                        {isEditing ? (
                          <div className="text-[11px]">
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="inline-block outline-none rounded-[2px] px-0.5 -mx-0.5 focus:bg-muted/80 focus:ring-1 focus:ring-border hover:bg-muted/50 cursor-text text-cyan-400/80"
                              onBlur={(e) =>
                                onUpdate(movie.id, {
                                  links: (movie.links ?? []).map((l) =>
                                    l.id === link.id
                                      ? { ...l, label: e.currentTarget.innerText }
                                      : l
                                  ),
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                            <span className="text-muted-foreground/20 mx-1">
                              &mdash;
                            </span>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="inline-block outline-none rounded-[2px] px-0.5 -mx-0.5 focus:bg-muted/80 focus:ring-1 focus:ring-border hover:bg-muted/50 cursor-text text-muted-foreground/40 truncate max-w-[200px] align-bottom"
                              onBlur={(e) =>
                                onUpdate(movie.id, {
                                  links: (movie.links ?? []).map((l) =>
                                    l.id === link.id
                                      ? { ...l, url: e.currentTarget.innerText }
                                      : l
                                  ),
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              dangerouslySetInnerHTML={{ __html: link.url }}
                            />
                          </div>
                        ) : (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() =>
                        onUpdate(movie.id, {
                          links: [
                            ...(movie.links ?? []),
                            {
                              id: generateId(),
                              url: "https://perplexity.ai/search/...",
                              label: "New thread",
                            },
                          ],
                        })
                      }
                      className="text-[10px] font-medium text-cyan-500/50 hover:text-cyan-400 transition-colors"
                    >
                      + Link a thread
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-border/10 shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            Close
          </button>
          {isEditing && (
            <button
              onClick={() => {
                onDelete(movie.id);
                onClose();
              }}
              className="flex items-center gap-1 text-xs font-medium text-red-400/60 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MoviesClientProps {
  initialData: MoviesData;
  isEditing: boolean;
  secretToLogin?: string;
}

export function MoviesClient({
  initialData,
  isEditing: isUserAuthenticated,
  secretToLogin,
}: MoviesClientProps) {
  const normalizedData: MoviesData = {
    movies: initialData.movies.map((m) => ({
      ...m,
      quotes: m.quotes ?? [],
      tags: m.tags ?? [],
      links: m.links ?? [],
    })),
  };
  const [data, setData] = useState<MoviesData>(normalizedData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const isEditing = isUserAuthenticated && !isPreviewMode;
  const selectedMovie = selectedId
    ? data.movies.find((m) => m.id === selectedId) ?? null
    : null;

  React.useEffect(() => {
    if (secretToLogin) {
      loginAdmin(secretToLogin);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [secretToLogin]);

  React.useEffect(() => {
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

  const updateMovie = (id: string, updates: Partial<MovieEntry>) => {
    setData((prev) => ({
      ...prev,
      movies: prev.movies.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
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
    <div className="min-h-screen bg-background text-foreground font-sans px-4 pb-24 pt-28 sm:pb-28 sm:pt-36 selection:bg-primary/20 relative">
      {isUserAuthenticated && (
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:bg-muted transition-all text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={isPreviewMode ? "Back to Edit Mode" : "Preview Mode"}
        >
          {isPreviewMode ? (
            <Edit2 className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      )}

      {isEditing && saveStatus !== "idle" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/90 backdrop-blur-md border border-border/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            The Films That Stay
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground/60 max-w-md mx-auto mt-2">
            I don&rsquo;t watch movies to pass time. I watch them to feel, to
            think, to be moved.
          </p>
          {data.movies.length > 0 && (
            <p className="text-xs text-muted-foreground/40 font-mono mt-1">
              {data.movies.length}{" "}
              {data.movies.length === 1 ? "film" : "films"}
            </p>
          )}
        </header>

        {data.movies.length === 0 && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="w-10 h-10 text-muted-foreground/15 mb-3" />
            <p className="text-sm text-muted-foreground/40">No films collected yet.</p>
          </div>
        ) : (
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
              {data.movies.map((movie, index) => (
                <SortablePoster
                  key={movie.id}
                  movie={movie}
                  index={index}
                  isEditing={isEditing}
                  onSelect={() => setSelectedId(movie.id)}
                />
              ))}
              {isEditing && (
                <button
                  onClick={addMovie}
                  className="aspect-[2/3] rounded-xl border-2 border-dashed border-border/30 flex flex-col items-center justify-center gap-2 hover:border-border/60 hover:bg-muted/20 transition-all text-muted-foreground/40 hover:text-foreground/60"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              )}
            </div>
          </DragDropProvider>
        )}
      </div>

      {selectedMovie && (
        <MovieDialog
          movie={selectedMovie}
          open
          isEditing={isEditing}
          onClose={() => setSelectedId(null)}
          onUpdate={updateMovie}
          onDelete={deleteMovie}
        />
      )}
    </div>
  );
}
