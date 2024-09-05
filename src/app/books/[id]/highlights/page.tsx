import React from "react";
import { getHighlights } from "./api";
import HighlightsList from "./HighlightsList";

interface PageProps {
  params: { id: string };
  searchParams: { page?: string; sort?: "date" | "location" };
}

export default async function BookHighlightsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = params;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const sort = searchParams.sort || "date";

  const highlightsData = await getHighlights(id, page, sort);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-800 dark:text-green-400">
          Book Highlights
        </h1>
        <HighlightsList
          initialHighlights={highlightsData.results}
          hasMore={!!highlightsData.next}
          bookId={id}
          initialSort={sort}
        />
      </div>
    </div>
  );
}
