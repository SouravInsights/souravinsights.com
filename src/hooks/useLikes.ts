import { useCallback, useEffect, useState } from "react";

export interface LikeState {
  totalLikes: number;
  userLikes: number;
}

export interface UseLikesOptions {
  /** Identifier for the thing being liked (a post slug, a link id, …). */
  id: string;
  /** Endpoint that supports GET ?param=id and POST { param: id }. */
  endpoint: string;
  /** Query/body key for the id. Defaults to "id". */
  param?: string;
  /** How many times one visitor may like this item. Defaults to 10. */
  max?: number;
  initialTotalLikes?: number;
  initialUserLikes?: number;
}

export interface UseLikesResult extends LikeState {
  isLoading: boolean;
  isError: boolean;
  isMaxed: boolean;
  addLike: () => Promise<void>;
}

/**
 * The single source of truth for "liking" anywhere on the site: posts and
 * curated links both read and write through this hook.
 *
 * A like is applied optimistically and then reconciled with the server, so the
 * heart responds instantly while the count stays authoritative. Only the server
 * can reject a like (e.g. the per-visitor cap), and a rejection rolls back.
 */
export function useLikes({
  id,
  endpoint,
  param = "id",
  max = 10,
  initialTotalLikes = 0,
  initialUserLikes = 0,
}: UseLikesOptions): UseLikesResult {
  const [totalLikes, setTotalLikes] = useState<number>(initialTotalLikes);
  const [userLikes, setUserLikes] = useState<number>(initialUserLikes);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchLikes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${endpoint}?${param}=${encodeURIComponent(id)}`
        );
        if (!response.ok) throw new Error("Failed to fetch likes");

        const data: LikeState = await response.json();
        if (cancelled) return;

        setTotalLikes(data.totalLikes);
        setUserLikes(data.userLikes);
        setIsError(false);
      } catch (error) {
        if (!cancelled) setIsError(true);
        console.error("Error fetching likes:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchLikes();
    return () => {
      cancelled = true;
    };
  }, [id, endpoint, param]);

  const addLike = useCallback(async () => {
    if (userLikes >= max) return;

    // Optimistic: respond immediately, reconcile with the server after.
    const previous: LikeState = { totalLikes, userLikes };
    setTotalLikes((value) => value + 1);
    setUserLikes((value) => value + 1);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [param]: id }),
      });
      if (!response.ok) throw new Error("Failed to add like");

      const data: LikeState = await response.json();
      setTotalLikes(data.totalLikes);
      setUserLikes(data.userLikes);
      setIsError(false);
    } catch (error) {
      // Roll back — the server is authoritative.
      setTotalLikes(previous.totalLikes);
      setUserLikes(previous.userLikes);
      setIsError(true);
      console.error("Error adding like:", error);
    }
  }, [endpoint, param, id, max, totalLikes, userLikes]);

  return {
    totalLikes,
    userLikes,
    isLoading,
    isError,
    isMaxed: userLikes >= max,
    addLike,
  };
}