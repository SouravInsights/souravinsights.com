import { useState, useEffect } from "react";

interface UsePostLikesProps {
  slug: string;
  initialTotalLikes?: number;
  initialUserLikes?: number;
}

interface UsePostLikesReturn {
  totalLikes: number;
  userLikes: number;
  isLoading: boolean;
  isError: boolean;
  addLike: () => Promise<void>;
}

export function usePostLikes({
  slug,
  initialTotalLikes = 0,
  initialUserLikes = 0,
}: UsePostLikesProps): UsePostLikesReturn {
  const [totalLikes, setTotalLikes] = useState<number>(initialTotalLikes);
  const [userLikes, setUserLikes] = useState<number>(initialUserLikes);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Fetch initial likes data
  useEffect(() => {
    const fetchLikes = async () => {
      if (!slug) return;

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/blog/likes?slug=${encodeURIComponent(slug)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch likes");
        }

        const data = await response.json();
        setTotalLikes(data.totalLikes);
        setUserLikes(data.userLikes);
        setIsError(false);
      } catch (error) {
        console.error("Error fetching likes:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikes();
  }, [slug]);

  // Function to add a like
  const addLike = async () => {
    if (userLikes >= 10) return; // Max likes reached

    try {
      setIsLoading(true);
      const response = await fetch("/api/blog/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      if (!response.ok) {
        throw new Error("Failed to add like");
      }

      const data = await response.json();
      setTotalLikes(data.totalLikes);
      setUserLikes(data.userLikes);
      setIsError(false);
    } catch (error) {
      console.error("Error adding like:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    totalLikes,
    userLikes,
    isLoading,
    isError,
    addLike,
  };
}
