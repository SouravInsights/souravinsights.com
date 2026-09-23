"use client";

import { useEffect, useState } from "react";
import type { HTMLAttributes } from "react";
import Image from "next/image";
import { Film } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";
import { useSpotlight, spotlightClass } from "@/hooks/useSpotlight";

const MAX_MOVIES = 8;

interface MoviePreview {
  id: string;
  title: string;
  posterData: string | null;
  tag: string | null;
}

/** Compact poster + title + tag. Mirrors the book rows so the two shelves match. */
function MovieRow({
  movie,
  dimmed,
  ...props
}: {
  movie: MoviePreview;
  dimmed: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      title={movie.title}
      {...props}
      className={`group flex items-start gap-3 ${spotlightClass(dimmed)}`}
    >
      <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded border border-border bg-secondary">
        {movie.posterData ? (
          <Image
            src={movie.posterData}
            alt={movie.title}
            fill
            sizes="40px"
            unoptimized
            className="object-cover transition-[transform,filter] duration-300 group-hover:scale-[1.05] group-hover:brightness-110 dark:brightness-[0.7] dark:group-hover:brightness-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Film className="h-4 w-4 text-faint-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="type-caption line-clamp-2 font-medium leading-snug text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
          {movie.title}
        </p>
        {movie.tag ? (
          <p className="type-caption mt-1 line-clamp-1 capitalize text-faint-foreground">
            {movie.tag.replace(/-/g, " ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Shelf() {
  const [movies, setMovies] = useState<MoviePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDimmed, getItemProps } = useSpotlight();

  useEffect(() => {
    async function fetchMovies() {
      try {
        const response = await fetch("/api/movies");
        const data = await response.json();
        if (data.movies) {
          setMovies(data.movies.slice(0, MAX_MOVIES));
        }
      } catch (error) {
        console.error("Error fetching movies preview:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="aspect-[2/3] w-10 shrink-0 animate-pulse rounded bg-secondary" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-full animate-pulse rounded bg-secondary" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
      {movies.map((movie, index) => (
        <FadeIn key={movie.id} delay={Math.min(index, 12) * 0.03}>
          <MovieRow
            movie={movie}
            dimmed={isDimmed(index)}
            {...getItemProps(index)}
          />
        </FadeIn>
      ))}
    </div>
  );
}

/**
 * Home page shelf: a dense list of films that stayed with me. Mirrors the
 * reading shelf's layout so the two columns read as a symmetric pair.
 */
export function MoviesShelf() {
  return (
    <section className="group/section">
      <FadeIn>
        <SectionHeader
          title="Movies"
          href="/movies"
          description="Films I keep coming back to, the ones that left something behind."
        />
      </FadeIn>
      <Shelf />
    </section>
  );
}