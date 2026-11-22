// src/hooks/usePostViews.ts
import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/query/api";

interface UsePostViewsProps {
  slug: string;
  initialViews?: number;
}

interface UsePostViewsReturn {
  views: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Records one view per slug and returns the running total.
 *
 * A view is a write, so it goes out exactly once per mount through a mutation
 * rather than being cached as state. `isLoading` stays true from mount until the
 * server answers, so the caller keeps its placeholder while the count is unknown.
 * https://tanstack.com/query/v5/docs/framework/react/guides/mutations
 */
export function usePostViews({
  slug,
  initialViews = 0,
}: UsePostViewsProps): UsePostViewsReturn {
  const posted = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiJson<{ views: number }>("/api/blog/views", {
        method: "POST",
        body: JSON.stringify({ slug }),
      }),
  });

  useEffect(() => {
    if (!slug || posted.current === slug) return;
    posted.current = slug;
    mutation.mutate();
    // One view per slug per mount; `mutate` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return {
    views: mutation.data?.views ?? initialViews,
    isLoading: mutation.isIdle || mutation.isPending,
    isError: mutation.isError,
  };
}
