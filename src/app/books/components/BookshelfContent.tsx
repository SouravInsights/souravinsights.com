"use client";

import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GET_BOOKS_BY_STATUS } from "../queries/getBooksByStatus";
import { GET_PROFILE } from "../queries/getProfile";
import { BookCard } from "./BookCard";

type ReadingStatus = "WANTS_TO_READ" | "IS_READING" | "FINISHED";

export const BookshelfContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReadingStatus>("IS_READING");
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
  console.log("booksData:", data);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleTabChange = (value: string) => {
    setActiveTab(value as ReadingStatus);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="IS_READING">Currently Reading</TabsTrigger>
        <TabsTrigger value="FINISHED">Completed</TabsTrigger>
        <TabsTrigger value="WANTS_TO_READ">Want to Read</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {data?.booksByReadingStateAndProfile.map((book: any) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};
