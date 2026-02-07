"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";
import { SkeletonBookCard } from "./SkeletonBookCard";
import { Book, Bookmark, CheckCircle } from "lucide-react";

type ReadingStatus = "WANTS_TO_READ" | "IS_READING" | "FINISHED";

export const BookshelfContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReadingStatus>("IS_READING");
  const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });
  // console.log("profileData:", profileData);

  const { loading, error, data } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 10,
      offset: 0,
      readingStatus: activeTab,
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });
  // console.log("data from BookshelfContent useQuery:", data);

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
    if (loading || profileLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(10)].map((_, index) => (
            <SkeletonBookCard key={index} />
          ))}
        </div>
      );
    }

    if (error || profileError) {
      return (
        <div className="text-red-500 text-center">
          Error: {error?.message || profileError?.message}
        </div>
      );
    }

    if (!profileData?.profile) {
      return <div className="text-center text-muted-foreground">Profile not found.</div>;
    }

    const books = data?.booksByReadingStateAndProfile || [];

    if (books.length === 0) {
      return (
         <div className="text-center text-muted-foreground py-10">
            No books found in this shelf.
         </div>
      );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {books.map((book: any) => (
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
        <TabsList className="flex justify-start mb-6 bg-transparent overflow-x-auto w-full p-0 h-auto">
          {Object.entries(tabContent).map(
            ([status, { icon, title, fullTitle }]) => (
              <TabsTrigger
                key={status}
                value={status}
                className="px-4 py-2 mx-1 rounded-full border border-border hover:bg-accent hover:text-accent-foreground transition-all duration-300 flex items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
              >
                <div className="flex items-center justify-center space-x-2">
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
