"use client";

import React, { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { motion } from "framer-motion";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";
import { SkeletonBookCard } from "./SkeletonBookCard";

type ReadingStatus = "WANTS_TO_READ" | "IS_READING" | "FINISHED";

interface BookWithStatus {
  book: any;
  status: "reading" | "want to read" | "read";
}

interface BookshelfContentProps {
  onBooksLoaded?: (count: number) => void;
}

export const BookshelfContent: React.FC<BookshelfContentProps> = ({ onBooksLoaded }) => {
  const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });

  // Fetch all three reading statuses
  const { loading: loadingReading, data: dataReading } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 50,
      offset: 0,
      readingStatus: "IS_READING",
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });

  const { loading: loadingWantToRead, data: dataWantToRead } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 50,
      offset: 0,
      readingStatus: "WANTS_TO_READ",
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });

  const { loading: loadingFinished, data: dataFinished } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 50,
      offset: 0,
      readingStatus: "FINISHED",
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });

  const loading = profileLoading || loadingReading || loadingWantToRead || loadingFinished;

  // Combine all books with their status
  const allBooks: BookWithStatus[] = [
    ...(dataReading?.booksByReadingStateAndProfile || []).map((book: any) => ({
      book,
      status: "reading" as const,
    })),
    ...(dataWantToRead?.booksByReadingStateAndProfile || []).map((book: any) => ({
      book,
      status: "want to read" as const,
    })),
    ...(dataFinished?.booksByReadingStateAndProfile || []).map((book: any) => ({
      book,
      status: "read" as const,
    })),
  ];

  // Notify parent when books are loaded
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
    return <div className="text-center text-muted-foreground py-10">Profile not found.</div>;
  }

  if (allBooks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No books found.
      </div>
    );
  }

  return (
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
          <BookCard book={book} status={status} />
        </motion.div>
      ))}
    </motion.div>
  );
};
