"use client";

import type { HTMLAttributes } from "react";
import { ApolloProvider, useQuery } from "@apollo/client";
import Image from "next/image";
import client from "@/app/lib/literalApiClient";
import { GET_BOOKS_BY_STATUS } from "@/app/books/queries/getBooksByStatus";
import { GET_PROFILE } from "@/app/books/queries/getProfile";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";
import { useSpotlight, spotlightClass } from "@/hooks/useSpotlight";

const MAX_BOOKS = 8;

/** Compact cover + title + author. Denser than a bare shelf so the column fills. */
function BookRow({
  book,
  dimmed,
  ...props
}: {
  book: any;
  dimmed: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const author = book.authors?.[0]?.name;

  return (
    <div
      title={book.title}
      {...props}
      className={`group flex items-start gap-3 ${spotlightClass(dimmed)}`}
    >
      <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded border border-border bg-secondary">
        {book.cover ? (
          <Image
            src={book.cover}
            alt={book.title}
            fill
            sizes="40px"
            unoptimized
            className="object-cover transition-[transform,filter] duration-300 group-hover:scale-[1.05] group-hover:brightness-110 dark:brightness-[0.7] dark:group-hover:brightness-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="type-label">{book.title?.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="type-caption line-clamp-2 font-medium leading-snug text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
          {book.title}
        </p>
        {author ? (
          <p className="type-caption mt-1 line-clamp-1 text-faint-foreground">
            {author}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Shelf() {
  const { isDimmed, getItemProps } = useSpotlight();

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
  } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });

  const profileId = profileData?.profile?.id;

  const { loading: loadingReading, data: readingData } = useQuery(
    GET_BOOKS_BY_STATUS,
    {
      variables: { limit: MAX_BOOKS, offset: 0, readingStatus: "IS_READING", profileId },
      skip: !profileId,
    }
  );

  const readingBooks: any[] = readingData?.booksByReadingStateAndProfile ?? [];

  // Recently finished books fill out the list when nothing is in progress.
  const { loading: loadingFinished, data: finishedData } = useQuery(
    GET_BOOKS_BY_STATUS,
    {
      variables: { limit: MAX_BOOKS, offset: 0, readingStatus: "FINISHED", profileId },
      skip: !profileId,
    }
  );

  if (profileError || (!profileLoading && !profileId)) return null;

  const loading = !profileId || loadingReading || loadingFinished;

  const seen = new Set<string>();
  const books: any[] = [
    ...readingBooks,
    ...(finishedData?.booksByReadingStateAndProfile ?? []),
  ]
    .filter((book) => {
      if (seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    })
    .slice(0, MAX_BOOKS);

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

  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4">
      {books.map((book, index) => (
        <FadeIn key={book.id} delay={Math.min(index, 12) * 0.03}>
          <BookRow
            book={book}
            dimmed={isDimmed(index)}
            {...getItemProps(index)}
          />
        </FadeIn>
      ))}
    </div>
  );
}

/**
 * Home page shelf: a dense list of what I'm reading (plus what I just
 * finished), with a link into the full library. Keeps its own Apollo provider
 * so the home page stays lean.
 */
export function ReadingShelf() {
  return (
    <ApolloProvider client={client}>
      <section className="group/section">
        <FadeIn>
          <SectionHeader
            title="Reading"
            href="/books"
            description="Books currently on my nightstand, and the ones I just closed."
          />
        </FadeIn>
        <Shelf />
      </section>
    </ApolloProvider>
  );
}