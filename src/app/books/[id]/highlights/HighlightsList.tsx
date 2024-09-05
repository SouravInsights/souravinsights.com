"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Highlight } from "../../types/bookTypes";

interface HighlightsListProps {
  initialHighlights: Highlight[];
  hasMore: boolean;
  bookId: string;
  initialSort: "date" | "location";
}

export default function HighlightsList({
  initialHighlights,
  hasMore: initialHasMore,
  bookId,
  initialSort,
}: HighlightsListProps) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const router = useRouter();

  const loadMore = async () => {
    const nextPage = page + 1;
    const res = await fetch(
      `/api/readwise/highlights?bookId=${bookId}&page=${nextPage}&sort=${sortBy}`
    );
    const data = await res.json();
    setHighlights((prev) => [...prev, ...data.results]);
    setPage(nextPage);
    setHasMore(!!data.next);
  };

  const handleSortChange = (newSort: "date" | "location") => {
    setSortBy(newSort);
    router.push(`/books/${bookId}/highlights?sort=${newSort}`);
  };

  return (
    <>
      <div className="mb-4">
        <select
          value={sortBy}
          onChange={(e) =>
            handleSortChange(e.target.value as "date" | "location")
          }
          className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded"
        >
          <option value="date">Sort by Date</option>
          <option value="location">Sort by Location</option>
        </select>
      </div>

      {highlights.map((highlight, index) => (
        <motion.div
          key={highlight.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4"
        >
          <p className="text-gray-800 dark:text-white mb-2">{highlight.text}</p>
          {highlight.note && (
            <p className="text-gray-600 dark:text-gray-400 italic mb-2">
              Note: {highlight.note}
            </p>
          )}
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Location: {highlight.location}</span>
            <span>
              Date: {new Date(highlight.highlighted_at).toLocaleDateString()}
            </span>
          </div>
          {highlight.tags && highlight.tags.length > 0 && (
            <div className="mt-2">
              {highlight.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs mr-2 mb-2"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ))}

      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </>
  );
}
