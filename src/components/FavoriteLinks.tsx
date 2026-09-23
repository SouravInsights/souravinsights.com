"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/FadeIn";
import { useSpotlight, spotlightClass } from "@/hooks/useSpotlight";
import { emphasisClass } from "@/lib/emphasis";

interface FavoriteLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
}

/** Hostname only, without protocol or `www.`, to hint at the source. */
const shortDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function FavoriteLinks() {
  const [favorites, setFavorites] = useState<FavoriteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDimmed, getItemProps } = useSpotlight();

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/curated-links/latest");
        const data = await response.json();
        if (data.success) {
          setFavorites(data.links.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching favorite links:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col">
        {[...Array(6)].map((_, index) => (
          <div key={index}>
            {index > 0 && <div className="rule" aria-hidden="true" />}
            <div className="list-row min-h-[4.5rem] sm:items-center">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {favorites.map((favorite, index) => (
        <div key={favorite.id}>
          {index > 0 && <div className="rule" aria-hidden="true" />}
          <FadeIn delay={Math.min(index, 12) * 0.03}>
            <a
              href={favorite.url}
              target="_blank"
              rel="noopener noreferrer"
              {...getItemProps(index)}
              className={`list-row group min-h-[4.5rem] sm:items-center ${spotlightClass(
                isDimmed(index)
              )}`}
            >
              <h3
                className={`type-heading min-w-0 line-clamp-2 transition-colors group-hover:text-green-700 dark:group-hover:text-green-500 ${emphasisClass(
                  index
                )}`}
              >
                {favorite.title}
              </h3>
              <span className="flex shrink-0 items-center gap-2 type-caption">
                <span className="text-faint-foreground">
                  {shortDomain(favorite.url)}
                </span>
                {favorite.category && (
                  <span className="hidden items-center gap-2 sm:flex">
                    <span aria-hidden="true" className="text-border">
                      ·
                    </span>
                    <span>{favorite.category}</span>
                  </span>
                )}
              </span>
            </a>
          </FadeIn>
        </div>
      ))}
    </div>
  );
}