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
      className="my-8 p-4 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col space-y-2 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400 text-center">
          My Reading Companion
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300">
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
  return (
    <ApolloProvider client={client}>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 md:px-6 md:py-8 px-2 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-green-800 dark:text-green-400">
            My Reading Journey
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore my reading journey: see what I’m reading now, what’s next,
            and the books I’ve finished.
          </p>

          <BookshelfContent />

          {/* Kindle Oasis Showcase */}
          <KindleImageDisplay />

          {/* Literal Club Shoutout Section */}
          <motion.div
            className="mt-16 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-green-200 dark:border-green-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="md:w-1/2 md:p-8 p-4 px-4 py-8">
                <Image
                  src="/literal-wordmark.png"
                  alt="Literal Club Logo"
                  width={150}
                  height={50}
                  className="mb-4"
                />
                <h2 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-400">
                  Powered by Literal Club
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  This bookshelf is brought to life using Literal Club's amazing
                  GraphQL API. Literal Club offers a beautiful UI and robust API
                  for book lovers and developers alike.
                </p>
                <a
                  href="https://literal.club"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  Try Literal Club <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </div>
              <div className="md:w-1/2 bg-green-50 dark:bg-gray-700 p-4 md:p-8 overflow-x-auto">
                <pre className="text-sm md:text-base text-gray-800 dark:text-gray-200">
                  <code>{`
 query booksByReadingStateAndProfile(
    $limit: Int!
    $offset: Int!
    $readingStatus: ReadingStatus!
    $profileId: String!
  ) {
    booksByReadingStateAndProfile(
      limit: $limit
      offset: $offset
      readingStatus: $readingStatus
      profileId: $profileId
    ) {
      ...BookParts
    }
  }
        `}</code>
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ApolloProvider>
  );
};

export default BookshelfPage;
