"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ExternalLink, User } from "lucide-react";

interface FavoriteLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  creatorTwitter: string | null;
  createdAt: string;
}

export function FavoriteLinks() {
  const [favorites, setFavorites] = useState<FavoriteLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorite-links/public");
        const data = await response.json();
        if (data.success) {
          setFavorites(data.favorites);
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
      <section className="py-12 border-b border-border">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Favorite Links</h2>
            <p className="text-muted-foreground">
              Curated resources and tools I find valuable
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 border border-border rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
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
    <section className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-6 sm:p-6 md:p-8">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Favorite Links</h2>
          <p className="text-muted-foreground">
            Curated resources and tools I find valuable
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.slice(0, 6).map((favorite, index) => (
            <motion.a
              key={favorite.id}
              href={favorite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border rounded-lg p-4 hover:bg-accent transition-all duration-200 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1">
                  {favorite.title}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex-shrink-0 ml-2" />
              </div>

              {favorite.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {favorite.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {favorite.category && (
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {favorite.category}
                  </span>
                )}

                {favorite.creatorTwitter && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>@{favorite.creatorTwitter}</span>
                  </div>
                )}
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/curated-links"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            View all curated links <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
