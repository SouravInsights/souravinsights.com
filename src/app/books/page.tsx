/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client";
import client from "@/app/lib/literalApiClient";
import { BookshelfContent } from "./components/BookshelfContent";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const KindleImageDisplay: React.FC = () => {
  const kindleImages = ["/kindle1.jpg", "/kindle2.jpg", "/kindle3.jpg"];

  return (
    <motion.div
      className="my-8 p-4 md:p-8 rounded-lg shadow-lg overflow-hidden border border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col space-y-2 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
          My Reading Companion
        </h2>
        <p className="text-center text-muted-foreground">
          It's like carrying a whole library without the backache! One digital
          page at a time... 😬
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center justify-center gap-4 md:gap-8">
        {kindleImages.map((src, index) => (
          <motion.div
            key={src}
            className="relative w-full sm:w-64 h-64 sm:h-80 rounded-lg overflow-hidden shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
          >
            <Image
              src={src}
              alt={`Kindle Oasis ${index + 1}`}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const BookshelfPage: React.FC = () => {
  const [totalBooks, setTotalBooks] = React.useState<number | null>(null);

  return (
    <ApolloProvider client={client}>
      <div className="md:px-6 md:py-8 px-2 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-foreground">
            Library
          </h1>
          <p className="text-center text-muted-foreground mb-2 max-w-2xl mx-auto">
            Books I'm reading and have read lately.
          </p>
          {totalBooks !== null && (
            <p className="text-center text-sm text-muted-foreground/70 mb-8">
              Total read: {totalBooks}
            </p>
          )}

          <BookshelfContent onBooksLoaded={setTotalBooks} />

          {/* Kindle Oasis Showcase */}
          <KindleImageDisplay />

          {/* Literal Club Shoutout Section */}
          <motion.div
            className="mt-16 p-6 md:p-8 rounded-lg border border-border bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <pattern id="books-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M10 10h5v20h-5z M25 15h5v15h-5z" fill="currentColor" className="text-green-600" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#books-pattern)" />
              </svg>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 flex-1">
                {/* Theme-aware logo */}
                <div className="shrink-0">
                  <Image
                    src="/literal-wordmark.svg"
                    alt="Literal Club"
                    width={120}
                    height={40}
                    className="hidden dark:block opacity-90"
                  />
                  <Image
                    src="/literal-wordmark-light.svg"
                    alt="Literal Club"
                    width={120}
                    height={40}
                    className="block dark:hidden opacity-90"
                  />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I use Literal Club to track my reading. They have a nice API that powers this page.
                  </p>
                </div>
              </div>
              
              <a
                href="https://literal.club"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
              >
                Check it out <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </ApolloProvider>
  );
};

export default BookshelfPage;

