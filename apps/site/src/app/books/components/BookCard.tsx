import React, { useState } from "react";
import Image from "next/image";
import { Book } from "@/app/books/types/bookTypes";
import { BookCoverFallback } from "./BookCoverFallback";

interface BookCardProps {
  book: Book;
  forceGenerativeCover?: boolean;
}

/**
 * A single cover on the shelf. The status lives in the section heading, so the
 * card is just the artwork — outlined, no shadow, no badge.
 */
export const BookCard: React.FC<BookCardProps> = ({
  book,
  forceGenerativeCover = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const hasCover = book.cover && !imageError;
  const showGenerative = forceGenerativeCover || !hasCover;

  return (
    <div className="group relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-secondary">
      {!showGenerative && hasCover ? (
        <Image
          src={book.cover}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 50vw, 20vw"
          className="object-cover transition-[transform,filter] duration-300 group-hover:scale-[1.03] group-hover:brightness-110 dark:brightness-[0.7] dark:group-hover:brightness-100"
          unoptimized
          onError={() => setImageError(true)}
        />
      ) : (
        <BookCoverFallback
          title={book.title}
          author={book.authors?.[0]?.name}
        />
      )}
    </div>
  );
};