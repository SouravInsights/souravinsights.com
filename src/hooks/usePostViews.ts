// src/hooks/usePostViews.ts
import { useState, useEffect } from "react";

interface UsePostViewsProps {
  slug: string;
  initialViews?: number;
}

interface UsePostViewsReturn {
  views: number;
  isLoading: boolean;
  isError: boolean;
}

export function usePostViews({
  slug,
  initialViews = 0,
}: UsePostViewsProps): UsePostViewsReturn {
  const [views, setViews] = useState<number>(initialViews);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);

  // Record a view when the component mounts
  useEffect(() => {
    const recordView = async () => {
      if (!slug || hasRecorded) return;

      try {
        setIsLoading(true);
        const response = await fetch("/api/blog/views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slug }),
        });

        if (!response.ok) {
          throw new Error("Failed to record view");
        }

        const data = await response.json();
        setViews(data.views);
        setHasRecorded(true);
        setIsError(false);
      } catch (error) {
        console.error("Error recording view:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    recordView();
  }, [slug, hasRecorded]);

  return {
    views,
    isLoading,
    isError,
  };
}
