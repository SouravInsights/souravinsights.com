"use client";

import React, { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";
import { SkeletonBookCard } from "./SkeletonBookCard";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";

interface BookshelfContentProps {
  onBooksLoaded?: (count: number) => void;
  showGenerativeCovers?: boolean;
}

export const BookshelfContent: React.FC<BookshelfContentProps> = ({
  onBooksLoaded,
  showGenerativeCovers = false,
}) => {
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
    }
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
    }
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
    }
  );

  const loading =
    profileLoading || loadingReading || loadingWantToRead || loadingFinished;

  const groups = [
    {
      key: "reading",
      title: "Reading",
      books: dataReading?.booksByReadingStateAndProfile ?? [],
    },
    {
      key: "want-to-read",
      title: "Want to read",
      books: dataWantToRead?.booksByReadingStateAndProfile ?? [],
    },
    {
      key: "read",
      title: "Read",
      books: dataFinished?.booksByReadingStateAndProfile ?? [],
    },
  ];

  const total = groups.reduce((count, group) => count + group.books.length, 0);

  useEffect(() => {
    if (!loading && onBooksLoaded) {
      onBooksLoaded(total);
    }
  }, [loading, total, onBooksLoaded]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...Array(10)].map((_, index) => (
          <SkeletonBookCard key={index} />
        ))}
      </div>
    );
  }

  if (profileError) {
    return (
      <p className="type-caption py-10 text-center text-destructive">
        Couldn&apos;t load your library. Try again in a moment.
      </p>
    );
  }

  if (!profileData?.profile) {
    return (
      <p className="type-caption py-10 text-center">Profile not found.</p>
    );
  }

  if (total === 0) {
    return <p className="type-caption py-10 text-center">No books yet.</p>;
  }

  const nonEmptyGroups = groups.filter((group) => group.books.length > 0);

  return (
    <div className="space-y-12 sm:space-y-16">
      {nonEmptyGroups.map((group) => (
        <section key={group.key}>
          <SectionHeader
            title={group.title}
            description={`${group.books.length} ${
              group.books.length === 1 ? "book" : "books"
            }`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.books.map((book: any, index: number) => (
              <FadeIn key={book.id} delay={Math.min(index, 12) * 0.03}>
                <BookCard
                  book={book}
                  forceGenerativeCover={showGenerativeCovers}
                />
              </FadeIn>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};