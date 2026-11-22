"use client";

import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/react/sortable";
import { DotsSixVertical, FilmStrip } from "@phosphor-icons/react";
import type { MovieEntry } from "@/types/movies";

interface MovieCardProps {
  movie: MovieEntry;
  index: number;
  isEditing: boolean;
  /** True while this film owns the open detail view. */
  isActive: boolean;
  onSelect: () => void;
}

/**
 * One poster in the grid.
 *
 * The poster carries the shared `layoutId`, which means only one element in the
 * tree may hold it at a time. So while the detail is open this tile swaps to a
 * plain placeholder — same box, no id — keeping the grid's shape and leaving the
 * panel's frame as the sole owner.
 */
export function MovieCard({
  movie,
  index,
  isEditing,
  isActive,
  onSelect,
}: MovieCardProps) {
  const sortable = useSortable({ id: movie.id, index });

  return (
    <div
      ref={sortable.ref}
      data-dragging={sortable.isDragging || undefined}
      className="group relative data-[dragging]:opacity-30 data-[dragging]:scale-95"
    >
      {isActive ? (
        <div
          aria-hidden="true"
          className="aspect-[2/3] w-full rounded-lg border border-border bg-secondary"
        />
      ) : (
        <motion.div
          layoutId={`movie-poster-${movie.id}`}
          transition={{
            layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
          }}
          onClick={onSelect}
          style={{ borderRadius: 0, clipPath: "inset(0 round 0.5rem)" }}
          className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden border border-border bg-secondary shadow-sm transition-colors hover:border-border/80"
        >
          {movie.posterData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.posterData}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
              <FilmStrip className="mb-2 h-5 w-5 text-faint-foreground" />
              <span className="text-[10px] font-medium leading-tight text-faint-foreground line-clamp-3">
                {movie.title}
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p className="text-[10px] font-medium leading-tight text-white/90 line-clamp-2">
              {movie.title}
            </p>
          </div>
        </motion.div>
      )}

      {isEditing && !isActive && (
        <div
          ref={sortable.handleRef}
          className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 cursor-grab items-center justify-center rounded bg-black/50 text-white/80 opacity-0 transition-all hover:bg-black/70 active:cursor-grabbing group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVertical className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
