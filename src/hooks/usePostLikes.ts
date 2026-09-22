import { useLikes } from "./useLikes";

interface UsePostLikesProps {
  slug: string;
  initialTotalLikes?: number;
  initialUserLikes?: number;
}

/**
 * Blog-post likes. A thin binding over the shared `useLikes` hook so posts and
 * curated links share one implementation.
 */
export function usePostLikes({
  slug,
  initialTotalLikes = 0,
  initialUserLikes = 0,
}: UsePostLikesProps) {
  return useLikes({
    id: slug,
    endpoint: "/api/blog/likes",
    param: "slug",
    max: 10,
    initialTotalLikes,
    initialUserLikes,
  });
}