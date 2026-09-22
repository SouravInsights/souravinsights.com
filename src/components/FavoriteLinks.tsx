"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ExternalLink, ChevronLeft } from "lucide-react";

interface FavoriteLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
}

export function FavoriteLinks() {
  const [favorites, setFavorites] = useState<FavoriteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const nextLink = () => {
    setCurrentIndex((prev) => (prev === favorites.length - 1 ? 0 : prev + 1));
  };

  const prevLink = () => {
    setCurrentIndex((prev) => (prev === 0 ? favorites.length - 1 : prev - 1));
  };

  if (loading) {
    return (
      <section>
        <div className="space-y-8">
          {/* Mobile Skeleton */}
          <div className="md:hidden">
            <div className="card p-4 animate-pulse h-[140px] flex flex-col justify-between">
              <div>
                <div className="h-4 bg-muted rounded mb-2 w-4/5"></div>
                <div className="h-3 bg-muted rounded mb-1 w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
              <div className="h-4 bg-muted rounded w-20 mt-4"></div>
            </div>
          </div>

          {/* Desktop Skeleton */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="card p-4 animate-pulse"
              >
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="space-y-8">
        {/* Mobile: Single card with navigation */}
        <div className="md:hidden">
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.a
                key={currentIndex}
                href={favorites[currentIndex]?.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="group card card-interactive flex flex-col justify-between w-full min-h-[140px] p-4"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="type-heading group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors line-clamp-1">
                      {favorites[currentIndex]?.title}
                    </h3>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors flex-shrink-0 ml-2" />
                  </div>

                  {favorites[currentIndex]?.description && (
                    <p className="type-caption mb-3 line-clamp-2">
                      {favorites[currentIndex].description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between type-caption">
                  {favorites[currentIndex]?.category && (
                    <span className="bg-secondary px-2 py-1 rounded text-xs">
                      {favorites[currentIndex].category}
                    </span>
                  )}
                </div>
              </motion.a>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={prevLink}
              aria-label="Previous link"
              className="flex items-center gap-2 px-3 py-2 type-caption text-muted-foreground hover:text-green-600 dark:hover:text-green-500 transition-colors border border-border rounded-md hover:bg-accent"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {favorites.map((_, index) => (
                <button
                  key={index}
                  aria-label={`Show link ${index + 1}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-green-600 dark:bg-green-500"
                      : "bg-muted hover:bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextLink}
              aria-label="Next link"
              className="flex items-center gap-2 px-3 py-2 type-caption text-muted-foreground hover:text-green-600 dark:hover:text-green-500 transition-colors border border-border rounded-md hover:bg-accent"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="type-caption text-center mt-3 opacity-70">
            {currentIndex + 1} of {favorites.length}
          </p>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite, index) => (
            <motion.a
              key={favorite.id}
              href={favorite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group card card-interactive flex flex-col p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="type-heading group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors line-clamp-1">
                  {favorite.title}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors flex-shrink-0" />
              </div>

              {favorite.description && (
                <p className="type-caption mb-3 line-clamp-2">
                  {favorite.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between type-caption">
                {favorite.category && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                    {favorite.category}
                  </span>
                )}
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="/curated-links"
            className="inline-flex items-center gap-1.5 type-caption font-medium text-muted-foreground hover:text-green-600 dark:hover:text-green-500 transition-colors"
          >
            View all curated links <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
