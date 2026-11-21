import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/query/api";

interface UseGalleryViewsProps {
  videoId: string;
  initialViews?: number;
}

interface UseGalleryViewsReturn {
  views: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Records one view per video and returns the running total. The gallery is the
 * only caller, but this is deliberately the same shape as `usePostViews`: a view
 * is a write, so it goes out once per mount through a mutation, never through
 * cached query state.
 */
export function useGalleryViews({
  videoId,
  initialViews = 0,
}: UseGalleryViewsProps): UseGalleryViewsReturn {
  const posted = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiJson<{ views: number }>("/api/gallery/views", {
        method: "POST",
        body: JSON.stringify({ videoId }),
      }),
  });

  useEffect(() => {
    if (!videoId || posted.current === videoId) return;
    posted.current = videoId;
    mutation.mutate();
    // One view per video per mount; `mutate` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return {
    views: mutation.data?.views ?? initialViews,
    isLoading: mutation.isIdle || mutation.isPending,
    isError: mutation.isError,
  };
}
