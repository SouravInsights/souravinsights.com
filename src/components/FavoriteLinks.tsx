"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/curated-links/latest");
        const data = await response.json();
        if (data.success) {
          setFavorites(data.links.slice(0, 8));
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
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-6 py-3.5"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
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
          <motion.a
            href={favorite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="list-row group"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.03 }}
          >
            <h3 className="type-heading group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors min-w-0">
              {favorite.title}
            </h3>
            <span className="flex shrink-0 items-center gap-2 type-caption">
              <span className="text-muted-foreground/60">
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
          </motion.a>
        </div>
      ))}
    </div>
  );
}