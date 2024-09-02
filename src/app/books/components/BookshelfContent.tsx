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
  const { data: profileData } = useQuery(GET_PROFILE, {
    variables: { handle: "sourav" },
  });

  const { loading, error, data } = useQuery(GET_BOOKS_BY_STATUS, {
    variables: {
      limit: 10,
      offset: 0,
      readingStatus: activeTab,
      profileId: profileData?.profile?.id,
    },
    skip: !profileData?.profile?.id,
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as ReadingStatus);
  };

  const tabContent = {
    IS_READING: {
      icon: <Book className="w-6 h-6" />,
      title: "Currently Reading",
    },
    WANTS_TO_READ: {
      icon: <Bookmark className="w-6 h-6" />,
      title: "Want to Read",
    },
    FINISHED: { icon: <CheckCircle className="w-6 h-6" />, title: "Completed" },
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.booksByReadingStateAndProfile.map((book: any) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="bg-green-100 dark:bg-gray-700 p-1 rounded-full inline-flex space-x-1">
          {Object.entries(tabContent).map(([status, { icon, title }]) => (
            <TabsTrigger
              key={status}
              value={status}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600"
            >
              <div className="flex items-center space-x-2">
                {icon}
                <span>{title}</span>
              </div>
            </TabsTrigger>
          ))}
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
