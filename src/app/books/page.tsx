/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client";
import client from "@/app/lib/literalApiClient";
import { BookshelfContent } from "./components/BookshelfContent";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const BookshelfPage: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-green-800 dark:text-green-400">
            My Bookshelf
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Explore my reading journey: from current reads to future adventures
            and completed tales.
          </p>
          <BookshelfContent />

          {/* Literal Club Shoutout Section */}
          <motion.div
            className="mt-16 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-green-200 dark:border-green-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 p-8">
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
              <div className="md:w-1/2 bg-green-50 dark:bg-gray-700 p-8">
                <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  <code>{`
query GetBooks($readingStatus: ReadingStatus) {
books(readingStatus: $readingStatus) {
  id
  title
  cover
  authors {
    name
  }
  readingStatus
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
