import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiJson } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";

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
 * A like is applied optimistically to the query cache and then reconciled with
 * the server, so the heart responds instantly while the count stays
 * authoritative. Only the server can reject a like (e.g. the per-visitor cap),
 * and a rejection rolls back.
 * https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
 */
export function useLikes({
  id,
  endpoint,
  param = "id",
  max = 10,
  initialTotalLikes = 0,
  initialUserLikes = 0,
}: UseLikesOptions): UseLikesResult {
  const queryClient = useQueryClient();
  const key = qk.likes(endpoint, id);

  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    enabled: Boolean(id),
    queryFn: () =>
      apiJson<LikeState>(`${endpoint}?${param}=${encodeURIComponent(id)}`),
  });

  // The server-rendered counts stand in until the first read lands.
  const totalLikes = data?.totalLikes ?? initialTotalLikes;
  const userLikes = data?.userLikes ?? initialUserLikes;

  const mutation = useMutation({
    mutationFn: () =>
      apiJson<LikeState>(endpoint, {
        method: "POST",
        body: JSON.stringify({ [param]: id }),
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LikeState>(key);
      queryClient.setQueryData<LikeState>(key, (current) => {
        const base = current ?? { totalLikes, userLikes };
        return {
          totalLikes: base.totalLikes + 1,
          userLikes: base.userLikes + 1,
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      // Roll back — the server is authoritative.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (next) => queryClient.setQueryData(key, next),
  });

  const addLike = useCallback(async () => {
    if (userLikes >= max) return;
    try {
      await mutation.mutateAsync();
    } catch {
      // onError already rolled the optimistic update back.
    }
  }, [userLikes, max, mutation]);

  return {
    totalLikes,
    userLikes,
    isLoading,
    isError: isError || mutation.isError,
    isMaxed: userLikes >= max,
    addLike,
  };
}
