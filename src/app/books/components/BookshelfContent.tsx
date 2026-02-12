"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { motion, AnimatePresence } from "framer-motion";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";
import { SkeletonBookCard } from "./SkeletonBookCard";

interface BookWithStatus {
  book: any;
  status: "reading" | "want to read" | "read";
}

interface BookshelfContentProps {
  onBooksLoaded?: (count: number) => void;
}

export const BookshelfContent: React.FC<BookshelfContentProps> = ({
  onBooksLoaded,
}) => {
  const [showGenerativeCovers, setShowGenerativeCovers] = useState(false);

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
  } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });

  const { loading: loadingReading, data: dataReading } = useQuery(
    GET_BOOKS_BY_STATUS,
    {
      variables: {
        limit: 50,
        offset: 0,
        readingStatus: "IS_READING",
        profileId: profileData?.profile?.id,
      },
      skip: !profileData?.profile?.id,
    },
  );

  const { loading: loadingWantToRead, data: dataWantToRead } = useQuery(
    GET_BOOKS_BY_STATUS,
    {
      variables: {
        limit: 50,
        offset: 0,
        readingStatus: "WANTS_TO_READ",
        profileId: profileData?.profile?.id,
      },
      skip: !profileData?.profile?.id,
    },
  );

  const { loading: loadingFinished, data: dataFinished } = useQuery(
    GET_BOOKS_BY_STATUS,
    {
      variables: {
        limit: 50,
        offset: 0,
        readingStatus: "FINISHED",
        profileId: profileData?.profile?.id,
      },
      skip: !profileData?.profile?.id,
    },
  );

  const loading =
    profileLoading || loadingReading || loadingWantToRead || loadingFinished;

  const allBooks: BookWithStatus[] = [
    ...(dataReading?.booksByReadingStateAndProfile || []).map((book: any) => ({
      book,
      status: "reading" as const,
    })),
    ...(dataWantToRead?.booksByReadingStateAndProfile || []).map(
      (book: any) => ({
        book,
        status: "want to read" as const,
      }),
    ),
    ...(dataFinished?.booksByReadingStateAndProfile || []).map((book: any) => ({
      book,
      status: "read" as const,
    })),
  ];

  useEffect(() => {
    if (!loading && onBooksLoaded) {
      onBooksLoaded(allBooks.length);
    }
  }, [loading, allBooks.length, onBooksLoaded]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {[...Array(12)].map((_, index) => (
          <SkeletonBookCard key={index} />
        ))}
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="text-red-500 text-center py-10">
        Error: {profileError?.message}
      </div>
    );
  }

  if (!profileData?.profile) {
    return (
      <div className="text-center text-muted-foreground py-10">
        Profile not found.
      </div>
    );
  }

  if (allBooks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No books found.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowGenerativeCovers((prev) => !prev)}
          className="group flex items-center gap-3 px-4 py-2 rounded-full border border-border/60 hover:border-border bg-background/50 hover:bg-muted/40 transition-all duration-300"
          aria-pressed={showGenerativeCovers}
        >
          {/* Toggle track */}
          <div
            className={`relative w-10 h-[22px] rounded-full shrink-0 transition-colors duration-300 ${
              showGenerativeCovers
                ? "bg-[#16A349]/20"
                : "bg-muted-foreground/20 group-hover:bg-muted-foreground/30"
            }`}
          >
            <motion.div
              className={`absolute top-[3px] w-4 h-4 rounded-full transition-colors duration-300 ${
                showGenerativeCovers ? "bg-[#16A349]" : "bg-muted-foreground/50"
              }`}
              animate={{ left: showGenerativeCovers ? 18 : 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>

          {/* Label — left-anchored, width locked to longest label */}
          <div className="relative">
            <span
              className="text-sm invisible whitespace-nowrap"
              aria-hidden="true"
            >
              show generative covers
            </span>

            <AnimatePresence mode="wait">
              <motion.span
                key={showGenerativeCovers ? "gen" : "real"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-0 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 whitespace-nowrap"
              >
                {showGenerativeCovers
                  ? "show original covers"
                  : "show generative covers"}
              </motion.span>
            </AnimatePresence>
          </div>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
      >
        {allBooks.map(({ book, status }, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <BookCard
              book={book}
              status={status}
              forceGenerativeCover={showGenerativeCovers}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
