"use client";

import React, { useState, useRef, useCallback } from "react";
import { MoviesData, MovieEntry, emptyMovie, generateId, defaultMoviesHeader } from "@/types/movies";
import { EditableField } from "@/components/EditableField";
import { saveMoviesData, loginAdmin, uploadPoster } from "./actions";
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
      className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary border border-border hover:border-border/80 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer data-[dragging]:opacity-30 data-[dragging]:scale-95 shadow-sm"
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
          <Film className="w-5 h-5 text-muted-foreground/20 mb-2" />
          <span className="text-[10px] font-medium text-muted-foreground/40 leading-tight line-clamp-3">
            {movie.title}
          </span>
        </div>
      )}

      {/* Hover overlay with title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[10px] font-medium text-white/90 leading-tight line-clamp-2">
          {movie.title}
        </p>
      </div>

      {/* Drag handle */}
      {isEditing && (
        <div
          ref={sortable.handleRef}
          className="absolute top-1.5 left-1.5 z-10 flex items-center justify-center w-5 h-5 rounded bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-black/70 cursor-grab active:cursor-grabbing transition-all text-white/80"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

function NativeTextarea({
  value,
  onChange,
  placeholder,
  className,
  isEditing,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  isEditing: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, isEditing]);

  if (!isEditing) {
    return (
      <div 
        className={className} 
        dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, "<br />") }} 
      />
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none focus:bg-muted/80 focus:ring-1 focus:ring-border rounded-[4px] px-1 -mx-1 transition-all ${className || ""}`}
      rows={1}
    />
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1">
          <div className="flex flex-col sm:flex-row">
            {/* Poster */}
            <div className="shrink-0 w-full sm:w-44 aspect-[2/3] sm:aspect-auto sm:min-h-[360px] bg-secondary relative group/upload sm:sticky sm:top-0 border-b sm:border-b-0 sm:border-r border-border">
              {isUploadingImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 absolute inset-0">
                  <Loader2 className="w-8 h-8 text-muted-foreground/30 animate-spin" />
                  <span className="text-[10px] text-muted-foreground/50 font-medium px-4 text-center">
                    Uploading...
                  </span>
                </div>
              ) : movie.posterData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={movie.posterData}
                  alt={movie.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 absolute inset-0">
                  <Film className="w-8 h-8 text-muted-foreground/10" />
                  <span className="text-[10px] text-muted-foreground/25 font-medium px-4 text-center leading-relaxed">
                    {movie.title || "No poster yet"}
                  </span>
                </div>
              )}
              {isEditing && !isUploadingImage && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center group/btn cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                    <span className="text-[10px] font-medium text-white/80">Upload poster</span>
                  </div>
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

            {/* Content */}
            <div className="flex-1 min-w-0 p-5 sm:p-6 space-y-5">
              {/* Title */}
              <EditableField
                as="h2"
                value={movie.title}
                onChange={(val) => onUpdate(movie.id, { title: val })}
                isEditing={isEditing}
                placeholder="Film title"
                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug"
              />


              {/* Personal note */}
              <div className="border-l-2 border-green-600/30 dark:border-green-500/25 pl-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-600/60 dark:text-green-500/50 mb-1.5">
                  Why it stays with me
                </div>
                <NativeTextarea
                  value={movie.personalNote}
                  onChange={(val) => onUpdate(movie.id, { personalNote: val })}
                  isEditing={isEditing}
                  placeholder="What did this one do to you?"
                  className="text-sm leading-relaxed text-muted-foreground"
                />
              </div>

              {/* Extended Thoughts */}
              {(isEditing || !!movie.longNote) && (
                <div className="border-l-2 border-green-600/30 dark:border-green-500/25 pl-4 mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-600/60 dark:text-green-500/50 mb-1.5">
                    Extended Thoughts
                  </div>
                  <NativeTextarea
                    value={movie.longNote ?? ""}
                    onChange={(val) => onUpdate(movie.id, { longNote: val })}
                    isEditing={isEditing}
                    placeholder="Write a longer reflection or review..."
                    className="text-sm leading-relaxed text-muted-foreground min-h-[40px]"
                  />
                </div>
              )}

              {/* Quotes */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                    Lines
                  </h3>
                  {isEditing && (
                    <button
                      onClick={addQuote}
                      className="text-[11px] font-medium text-green-600/70 dark:text-green-500/60 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {(movie.quotes?.length ?? 0) === 0 && !isEditing && (
                  <p className="text-[12px] text-muted-foreground/30 italic">
                    No lines captured yet.
                  </p>
                )}
                <div className="space-y-2.5">
                  {(movie.quotes ?? []).map((quote) => (
                    <div
                      key={quote.id}
                      className="group/quote relative pl-4 border-l border-border py-1"
                    >
                      {isEditing && (
                        <button
                          onClick={() => deleteQuote(quote.id)}
                          className="absolute -left-2 top-1 p-0.5 rounded bg-destructive/10 opacity-0 group-hover/quote:opacity-100 hover:bg-destructive/20 transition-all text-destructive"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <Quote className="w-3 h-3 text-muted-foreground/25 mb-1" />
                      <EditableField
                        as="p"
                        value={quote.text}
                        onChange={(val) => updateQuote(quote.id, val)}
                        isEditing={isEditing}
                        multiline
                        placeholder="A line that stayed with you..."
                        className="text-sm leading-relaxed text-foreground/80"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags + Links */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-[13px] pt-1">
                {/* Tags */}
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                    Tags
                  </h3>
                  {(movie.tags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
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
                              className="hover:text-foreground transition-colors ml-0.5"
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
                      placeholder="e.g. perspective-shift, devastating (Enter)"
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
                      className="w-full text-[11px] bg-transparent outline-none border-b border-transparent focus:border-border/40 py-0.5 placeholder:text-muted-foreground/25 text-muted-foreground/60 transition-colors"
                    />
                  )}
                </div>

                {/* Links */}
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                    Links
                  </h3>
                  {(movie.links?.length ?? 0) === 0 && !isEditing && (
                    <p className="text-[11px] text-muted-foreground/30 italic">
                       Nothing linked yet.
                    </p>
                  )}
                  <div className="space-y-1.5">
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
                            className="absolute -left-1 top-0.5 p-0.5 rounded bg-destructive/10 opacity-0 group-hover/link:opacity-100 hover:bg-destructive/20 transition-all text-destructive"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        )}
                        {isEditing ? (
                          <div className="text-[11px]">
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="inline-block outline-none rounded-[2px] px-0.5 -mx-0.5 focus:bg-muted/80 focus:ring-1 focus:ring-border hover:bg-muted/50 cursor-text text-green-600/80 dark:text-green-500/70"
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
                              className="inline-block outline-none rounded-[2px] px-0.5 -mx-0.5 focus:bg-muted/80 focus:ring-1 focus:ring-border hover:bg-muted/50 cursor-text text-muted-foreground/40 truncate max-w-[180px] align-bottom"
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
                            className="inline-flex items-center gap-1 text-[11px] text-green-600/70 dark:text-green-500/70 hover:text-green-600 dark:hover:text-green-500 transition-colors"
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
                              url: "https://",
                              label: "Link label",
                            },
                          ],
                        })
                      }
                      className="text-[10px] font-medium text-muted-foreground/40 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                    >
                      + Add link
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-border shrink-0 bg-secondary/30">
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
              className="flex items-center gap-1.5 text-xs font-medium text-destructive/50 hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Remove film
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
    header: {
      title: initialData.header?.title ?? defaultMoviesHeader.title,
      description: initialData.header?.description ?? defaultMoviesHeader.description,
    },
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

  const updateHeader = (key: keyof MoviesData["header"], value: string) => {
    setData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 relative">
      {/* Preview toggle - matches CV page pattern */}
      {isUserAuthenticated && (
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-background/90 backdrop-blur-md border border-border shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:bg-muted transition-all text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={isPreviewMode ? "Back to Edit Mode" : "Preview Mode"}
        >
          {isPreviewMode ? (
            <Edit2 className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Save status indicator */}
      {isEditing && saveStatus !== "idle" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-500">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-24 pt-28 sm:pb-28 sm:pt-36">
        {/* Page header — editorial bordered block, matching home page section style */}
        <div className="mb-10 sm:mb-14">
          <div className="border border-border rounded-lg px-4 py-8 sm:px-8 sm:py-10 bg-background relative overflow-hidden">
            {/* Subtle dot-grid background */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                backgroundSize: "3rem 3rem",
              }}
            />
            <div className="relative z-10">
              <EditableField
                as="h1"
                value={data.header.title}
                onChange={(val) => updateHeader("title", val)}
                isEditing={isEditing}
                placeholder="Page title"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3"
              />
              <EditableField
                as="p"
                value={data.header.description}
                onChange={(val) => updateHeader("description", val)}
                isEditing={isEditing}
                multiline
                placeholder="What this page means to you..."
                className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xl"
              />
              {data.movies.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground/40 font-mono">
                  {data.movies.length}{" "}
                  {data.movies.length === 1 ? "film" : "films"} collected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Film grid */}
        {data.movies.length === 0 && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Film className="w-8 h-8 text-muted-foreground/15 mb-3" />
            <p className="text-sm text-muted-foreground/40">
              No films here yet.
            </p>
          </div>
        ) : (
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
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
                  className="aspect-[2/3] rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center gap-2 hover:border-border hover:bg-muted/20 transition-all text-muted-foreground/30 hover:text-muted-foreground/60"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Add film</span>
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
