"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";
import type { GalleryPayload } from "../gallery-types";
import { GalleryCountBadge } from "./GalleryCountBadge";
import { GalleryGrid } from "./GalleryGrid";

/**
 * The gallery's data boundary. The server page renders only this; the clips
 * come from `GET /api/gallery` through TanStack Query, and an edit invalidates
 * that key so the grid picks up the new title without a reload.
 */
export function GalleryClient() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.gallery(),
    queryFn: () => apiJson<GalleryPayload>("/api/gallery"),
  });

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-6 sm:pt-8">
        <FadeIn y={20} duration={0.3}>
          <PageHeader
            title="Gallery"
            description="Short recordings of the interfaces and interactions I build for my side projects: the motion, the states, and the small moments that decide how software feels."
            action={<GalleryCountBadge total={data?.videos.length ?? 0} />}
          />
        </FadeIn>

        <div className="mt-8">
          {isError ? (
            <p className="type-body text-muted-foreground">
              Couldn’t load the gallery.{" "}
              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium text-green-700 underline-offset-4 hover:underline dark:text-green-500"
              >
                Try again
              </button>
            </p>
          ) : !data ? (
            <GallerySkeleton />
          ) : (
            <GalleryGrid
              videos={data.videos}
              projects={data.projects}
              likeCounts={data.likes}
              viewCounts={data.views}
              isAdmin={data.isAdmin}
              shuffleSeed={data.shuffleSeed}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Four frames' worth of the grid, so the page settles into its final shape. */
function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[16/10] w-full rounded-lg" />
          <Skeleton className="mt-3 h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
