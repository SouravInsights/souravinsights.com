import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Book } from "@/app/books/types/bookTypes";
import { BookCoverFallback } from "./BookCoverFallback";

interface BookCardProps {
  book: Book;
  status: "reading" | "want to read" | "read";
}

export const BookCard: React.FC<BookCardProps> = ({ book, status }) => {
  const [imageError, setImageError] = useState(false);
  
  const statusConfig = {
    reading: {
      label: "Reading",
      color: "bg-blue-500/90",
    },
    "want to read": {
      label: "Want to Read",
      color: "bg-amber-500/90",
    },
    read: {
      label: "Read",
      color: "bg-green-500/90",
    },
  };

  const config = statusConfig[status];
  const hasCover = book.cover && !imageError;

  return (
    <motion.div
      className="group relative"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg">
        {hasCover ? (
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <BookCoverFallback 
            title={book.title} 
            author={book.authors?.[0]?.name}
          />
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`${config.color} text-white text-xs px-2 py-1 rounded-full font-medium shadow-md`}>
            {config.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

