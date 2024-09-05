import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star, BookOpen, BookMarked } from "lucide-react";
import { BookWithReadwiseId } from "@/app/books/types/bookTypes";
import { Button } from "@/components/ui/button";

interface BookCardProps {
  book: BookWithReadwiseId;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  console.log("book:", book);
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
        <CardContent className="p-0 relative">
          <div className="relative h-48 sm:h-64 w-full">
            <Image
              src={book.cover}
              alt={book.title}
              layout="fill"
              objectFit="cover"
              className="rounded-t-lg"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 p-4 w-full">
              <h3 className="text-sm sm:text-lg font-bold text-white line-clamp-2 hover:line-clamp-none transition-all duration-300">
                {book.title}
              </h3>
              <p className="text-xs sm:text-sm text-white opacity-80 truncate">
                {book.authors.map((a) => a.name).join(", ")}
              </p>
            </div>
          </div>
          <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-xs sm:text-sm font-medium">4.5</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4 text-green-500" />
                <span className="text-xs sm:text-sm font-medium">
                  {book.pageCount || "N/A"} pages
                </span>
              </div>
            </div>
            {/* <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Published: {new Date(book.publishedDate).getFullYear()}
            </p> */}
            {book.readwiseId && (
              <Link href={`/books/${book.readwiseId}/highlights`} passHref>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-green-600 border-green-600 hover:bg-green-600 hover:text-white dark:text-green-400 dark:border-green-400 dark:hover:bg-green-400 dark:hover:text-gray-900"
                >
                  <BookMarked className="w-4 h-4 mr-2" />
                  View Highlights
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
