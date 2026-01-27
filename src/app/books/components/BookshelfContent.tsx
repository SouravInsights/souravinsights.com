"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";
import { SkeletonBookCard } from "./SkeletonBookCard";
import { Book, Bookmark, CheckCircle } from "lucide-react";
import { matchBooks } from "../utils/bookMatcher";

type ReadingStatus = "WANTS_TO_READ" | "IS_READING" | "FINISHED";

export const BookshelfContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReadingStatus>("IS_READING");
  const [matchedBooks, setMatchedBooks] = useState<any[]>([]);
  const { data: profileData } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });
  console.log("profileData:", profileData);

  const { loading, error, data } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 10,
      offset: 0,
      readingStatus: activeTab,
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });
  console.log("data from BookshelfContent useQuery:", data);

  useEffect(() => {
    if (data?.booksByReadingStateAndProfile) {
      fetch("/api/readwise/books")
        .then((res) => res.json())
        .then((readwiseData) => {
          const matched = matchBooks(
            data.booksByReadingStateAndProfile,
            readwiseData.results
          );
          console.log("matched data:", matched);
          setMatchedBooks(matched);
        })
        .catch((err) => console.error("Error fetching Readwise books:", err));
    }
  }, [data]);

  console.log("matchedBooks", matchedBooks);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ReadingStatus);
  };

  const tabContent = {
    IS_READING: {
      icon: <Book className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Reading",
      fullTitle: "Currently Reading",
    },
    WANTS_TO_READ: {
      icon: <Bookmark className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "To Read",
      fullTitle: "Want to Read",
    },
    FINISHED: {
      icon: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Completed",
      fullTitle: "Completed",
    },
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(10)].map((_, index) => (
            <SkeletonBookCard key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 text-center">Error: {error.message}</div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {matchedBooks.map((book: any) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 rounded-lg border border-border">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="bg-muted p-1 rounded-full inline-flex w-full sm:w-auto">
          {Object.entries(tabContent).map(
            ([status, { icon, title, fullTitle }]) => (
              <TabsTrigger
                key={status}
                value={status}
                className="flex-1 sm:flex-initial rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-green-200 dark:data-[state=active]:bg-background whitespace-nowrap scroll-snap-align-start"
              >
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {icon}
                  <span className="hidden sm:inline text-sm lg:text-base">
                    {fullTitle}
                  </span>
                  <span className="sm:hidden text-sm lg:text-base">
                    {title}
                  </span>
                </div>
              </TabsTrigger>
            )
          )}
        </TabsList>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value={activeTab} className="mt-6">
              {renderContent()}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};
