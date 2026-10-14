import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level instant loading state.
 *
 * `loading.tsx` is Next's documented "instant loading state": it wraps the page
 * in a Suspense boundary, so a navigation shows this immediately instead of
 * leaving the previous page frozen on screen while the server renders.
 * https://nextjs.org/docs/app/api-reference/file-conventions/loading
 *
 * It is also load-bearing for speed, not just looks. The App Router only
 * prefetches a *dynamic* route up to its nearest loading boundary — with no
 * boundary in the tree, the prefetch request is skipped entirely. So removing
 * this file would make the first click slower, not faster.
 * https://nextjs.org/docs/app/api-reference/components/link
 *
 * Deliberately one neutral shape, not a per-page skeleton: each route is laid
 * out differently, and a skeleton that guesses the layout wrong is a lie that
 * has to be kept in sync by hand. The reads behind these routes are cached
 * (see `getLinks`), so this is a rarely-seen safety net, not the design.
 */
export function RouteLoading() {
  return (
    <div
      className="mx-auto max-w-5xl px-5 pb-10 pt-6 sm:px-6 sm:pt-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-4 w-2/3 max-w-md" />
      <div className="mt-10 flex flex-col gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
