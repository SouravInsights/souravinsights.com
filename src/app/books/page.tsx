"use client";

import React from "react";
import { ApolloProvider } from "@apollo/client";
import client from "@/app/lib/literalApiClient";
import { BookshelfContent } from "./components/BookshelfContent";

const BookshelfPage: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">My Bookshelf</h1>
        <BookshelfContent />
      </div>
    </ApolloProvider>
  );
};

export default BookshelfPage;
