/**
 * One registry for query keys.
 *
 * Keys written inline at each call site drift: two screens fetch the same thing
 * under different keys and never share a cache entry, and an invalidation that
 * names a key by hand silently stops matching after a rename. Keys live here so
 * there is a single place to see what the app caches and one spelling to match.
 * https://tanstack.com/query/v5/docs/framework/react/guides/query-keys
 */

export const qk = {
  insights: {
    latest: () => ["insights", "latest"] as const,
  },
  /** Likes are shared by scope so posts, links and books never collide. */
  likes: (scope: string, id: string) => ["likes", scope, id] as const,
  article: (urlKey: string) => ["article", urlKey] as const,
  movies: () => ["movies"] as const,
  deployment: () => ["deployment-status"] as const,
  nowPlaying: () => ["spotify", "now-playing"] as const,
  hnComments: (id: number) => ["hn", "comments", id] as const,
  highlights: (bookId: string) => ["books", "highlights", bookId] as const,
};
