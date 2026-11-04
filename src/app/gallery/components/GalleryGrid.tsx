"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import type { GalleryProject, GalleryVideo } from "../gallery-types";
import { VideoCard } from "./VideoCard";
import { VideoDetail } from "./VideoDetail";

interface GalleryGridProps {
  videos: GalleryVideo[];
  projects: GalleryProject[];
  likeCounts: Record<string, number>;
  viewCounts: Record<string, number>;
  isAdmin: boolean;
}

/**
 * The gallery's one interactive surface: the category filter, the grid, and
 * the detail overlay, kept in a single `LayoutGroup` so the tile-to-panel morph
 * has both ends in view.
 */
export function GalleryGrid({
  videos,
  projects,
  likeCounts,
  viewCounts,
  isAdmin,
}: GalleryGridProps) {
  const [category, setCategory] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Seeded from the server, then kept honest by the detail view while it is
  // open, so a tile never disagrees with the count you just changed.
  const [likes, setLikes] = useState(likeCounts);
  const [views, setViews] = useState(viewCounts);
  const triggerRef = useRef<HTMLElement | null>(null);
  const feedback = useFeedback();

  const projectOfKey = useMemo(() => {
    const map = new Map(projects.map((project) => [project.key, project]));
    return (key: string): GalleryProject =>
      map.get(key) ?? { key, name: key };
  }, [projects]);

  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const video of videos) {
      counts.set(video.project, (counts.get(video.project) ?? 0) + 1);
    }
    return [
      { key: "all", name: "All", count: videos.length },
      ...projects
        .filter((project) => counts.has(project.key))
        .map((project) => ({
          key: project.key,
          name: project.name,
          count: counts.get(project.key) ?? 0,
        })),
    ];
  }, [projects, videos]);

  const visible = useMemo(
    () =>
      category === "all"
        ? videos
        : videos.filter((video) => video.project === category),
    [videos, category]
  );

  const active = videos.find((video) => video.id === activeId) ?? null;

  const close = useCallback(() => {
    setActiveId(null);
    // Keyboard focus goes back to the tile it came from.
    triggerRef.current?.focus();
  }, []);

  // Identical values return the same reference, so reporting a total that has
  // not changed cannot spin a render loop.
  const setLikeTotal = useCallback((id: string, total: number) => {
    setLikes((current) =>
      current[id] === total ? current : { ...current, [id]: total }
    );
  }, []);

  const setViewTotal = useCallback((id: string, total: number) => {
    setViews((current) =>
      current[id] === total ? current : { ...current, [id]: total }
    );
  }, []);

  return (
    <LayoutGroup>
      {/* A segmented control, not a menu: there are as many projects as there
          are clips, and both numbers are visible at a glance. */}
      <div className="sticky-tabs -mx-5 flex bg-background px-5 py-3 sm:-mx-6 sm:px-6">
        <div
          role="group"
          aria-label="Filter by project"
          className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-lg border border-border p-0.5"
        >
          {filters.map((filter) => {
            const selected = category === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  feedback.select();
                  setCategory(filter.key);
                }}
                aria-pressed={selected}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="gallery-category-pill"
                    className="absolute inset-0 rounded-[5px] bg-foreground/10"
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  />
                )}
                <span className="relative z-10">{filter.name}</span>
                <span className="relative z-10 text-[11px] tabular-nums text-faint-foreground">
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={category}
        className="mt-6 grid animate-in grid-cols-1 gap-x-5 gap-y-8 fade-in duration-300 sm:grid-cols-2"
      >
        {visible.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            project={projectOfKey(video.project)}
            likeCount={likes[video.id] ?? 0}
            viewCount={views[video.id] ?? 0}
            isActive={activeId === video.id}
            onOpen={(opened) => {
              feedback.press();
              triggerRef.current = document.activeElement as HTMLElement | null;
              setActiveId(opened.id);
            }}
          />
        ))}
      </div>

      {/* No `AnimatePresence`: on close the panel unmounts at once and the only
          thing that moves is the video frame returning to its tile. Holding the
          panel mounted to fade it out is what produced a ghost of the modal
          hanging over the grid. */}
      {active && (
        <VideoDetail
          key={active.id}
          video={active}
          project={projectOfKey(active.project)}
          initialLikes={likes[active.id] ?? 0}
          initialViews={views[active.id] ?? 0}
          onClose={close}
          onLikeChange={(total) => setLikeTotal(active.id, total)}
          onViewChange={(total) => setViewTotal(active.id, total)}
          isAdmin={isAdmin}
        />
      )}
    </LayoutGroup>
  );
}
