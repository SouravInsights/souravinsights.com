"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { ArrowUp, ArrowUpDown, Check, ChevronDown, Clock, ExternalLink, Heart, History, LayoutGrid, Link2, List as ListIcon, Loader2, Search, Shuffle, SlidersHorizontal, Tag, Trash2, X } from "lucide-react";
import type { InsightsGroup } from "../utils/links-data";
import type { InsightsClientLink } from "../utils/links-data";
import {
  appendUTMParams,
  cleanShareUrl,
  dedupeByUrl,
  normalizeUrl,
  seededShuffle,
  sortByNewest,
  sortByOldest,
} from "../utils/urlUtils";
import { CATEGORY_ORDER, categoryLabel } from "../utils/categories";
import { LikeButton } from "./LikeButton";
import { CopyButton } from "@/components/CopyButton";
import { FadeIn } from "@/components/FadeIn";
import {
  PreviewCardProvider,
  PreviewCardTrigger,
} from "@/components/ui/PreviewCard";
import { PreviewLoader } from "@/components/ui/PreviewLoader";
import { ReaderView } from "./reader/ReaderView";
import { prefetchArticle } from "./reader/article-query";

interface InsightsListProps {
  groups: InsightsGroup[];
  linkData: { [key: string]: InsightsClientLink[] };
  previews: Record<string, string>;
  likeCounts: Record<string, number>;
  shuffleSeed: number;
  isAdmin: boolean;
}

const ITEMS_PER_PAGE = 60;

/** The hide/unhide API caps a batch at 200; "select all" can be larger. */
const HIDE_BATCH_LIMIT = 200;

const SORT_LABELS = {
  newest: "Newest",
  oldest: "Oldest",
  liked: "Most liked",
  shuffle: "Shuffle",
} as const;

type SortMode = keyof typeof SORT_LABELS;

/** Hostname only, without protocol or `www.`, to hint at the source. */
const shortDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const faviconFor = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${shortDomain(url)}&sz=64`;

type EnrichedLink = InsightsClientLink;

/** Every href stays the source; articles additionally open the reader on click. */
const hrefFor = (link: EnrichedLink) =>
  appendUTMParams(link.url, {
    utm_source: "souravinsights.com",
    utm_medium: "curated_links",
  });

export default function InsightsList({
  groups,
  linkData,
  previews,
  likeCounts,
  shuffleSeed,
  isAdmin: initialIsAdmin,
}: InsightsListProps) {
  const router = useRouter();
  // The reader is a view of this page: which article (urlKey) is open, if any.
  const [reading, setReading] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const topicsMenuRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortMode>("shuffle");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  // Clean-up (batch delete) mode. Session-only state on purpose: an admin-only
  // triage mode that survives a reload is one more thing to desync.
  const [cleanup, setCleanup] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastHidden, setLastHidden] = useState<string[] | null>(null);
  // Captured previews start server-rendered, then fill in as we warm misses.
  const [previewMap, setPreviewMap] = useState(previews);
  const warmedRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<{ url: string; refresh: boolean }[]>([]);
  const runningRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const sortedGroups = useMemo(
    () =>
      groups
        // Only surface categories we have a label/order for. Anything else
        // would leak in as a raw name.
        .filter(
          (group) =>
            (CATEGORY_ORDER as string[]).includes(group.name)
        )
        .sort(
          (a, b) =>
            (CATEGORY_ORDER as string[]).indexOf(a.name) -
            (CATEGORY_ORDER as string[]).indexOf(b.name)
        ),
    [groups]
  );

  const filters = useMemo(
    () => [
      { name: "all", label: "All" },
      ...sortedGroups.map((group) => ({
        name: group.name,
        label: categoryLabel(group.name),
      })),
    ],
    [sortedGroups]
  );

  const activeFilterLabel =
    filters.find((filter) => filter.name === activeCategory)?.label ?? "All";

  /**
   * The topic universe, counted across the whole visible list (not the
   * filtered view) so counts stay stable while you narrow. 643 topics exist;
   * 393 appear once. The picker shows the head (3+ links) and a search reaches
   * the long tail without ever putting it on screen unasked.
   */
  const topicCounts = useMemo(() => {
    // Counted inside the active category, so a count always matches what
    // picking that topic will actually show you.
    const scope =
      activeCategory === "all"
        ? sortedGroups.flatMap((group) => linkData[group.name] ?? [])
        : linkData[activeCategory] ?? [];
    const counts = new Map<string, number>();
    for (const link of scope) {
      for (const topic of link.topics ?? []) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeCategory, sortedGroups, linkData]);

  const topicOptions = useMemo(() => {
    const all = Array.from(topicCounts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
    const query = topicQuery.trim().toLowerCase();
    if (query) return all.filter(([topic]) => topic.includes(query)).slice(0, 60);
    return all.filter(([, count]) => count >= 3).slice(0, 40);
  }, [topicCounts, topicQuery]);

  const toggleTopic = (topic: string) => {
    feedback.select();
    setSelectedTopics((current) =>
      current.includes(topic)
        ? current.filter((t) => t !== topic)
        : [...current, topic]
    );
  };

  // Every link in the active view, newest first.
  const links = useMemo<EnrichedLink[]>(() => {
    const source: EnrichedLink[] =
      activeCategory === "all"
        ? sortedGroups.flatMap((group) =>
            (linkData[group.name] || []).map((link) => ({
              ...link,
              category: group.name,
            }))
          )
        : (linkData[activeCategory] || []).map((link) => ({
            ...link,
            category: activeCategory,
          }));

    // Newest first, then collapse the same URL posted to more than one
    // category so a link never appears twice in a view.
    return dedupeByUrl(sortByNewest(source));
  }, [activeCategory, sortedGroups, linkData]);

  const filteredLinks = useMemo(() => {
    let result = links;

    // Topics read as "either of these" — narrowing with AND dead-ends fast on
    // topics this small; category and search stay strict.
    if (selectedTopics.length > 0) {
      result = result.filter((link) =>
        selectedTopics.some((topic) => (link.topics ?? []).includes(topic))
      );
    }

    const query = searchTerm.trim().toLowerCase();
    if (!query) return result;
    return result.filter(
      (link) =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        (link.topics ?? []).some((topic) => topic.includes(query))
    );
  }, [links, searchTerm, selectedTopics]);

  // Quality sort keeps newest-first order for ties (Array.sort is stable).
  const sortedLinks = useMemo(() => {
    if (sort === "newest") return filteredLinks;
    if (sort === "oldest") return sortByOldest(filteredLinks);
    if (sort === "shuffle") return seededShuffle(filteredLinks, shuffleSeed);
    return [...filteredLinks].sort(
      (a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0)
    );
  }, [filteredLinks, sort, likeCounts, shuffleSeed]);

  useEffect(() => {
    setVisibleItems(ITEMS_PER_PAGE);
  }, [activeCategory, searchTerm, sort, view]);

  // Close the category menu on outside click or Escape.
  useEffect(() => {
    if (!filterMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen]);

  // Close the sort menu the same way.
  useEffect(() => {
    if (!sortMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sortMenuOpen]);

  // And the topics picker.
  useEffect(() => {
    if (!topicsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!topicsMenuRef.current?.contains(event.target as Node)) {
        setTopicsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTopicsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [topicsOpen]);

  // Remember the chosen view and sort across visits.
  useEffect(() => {
    const storedView = window.localStorage.getItem("insights:view");
    if (storedView === "grid" || storedView === "list") setView(storedView);
    // Versioned key: the old key held "newest" written by the previous
    // default, which would otherwise keep overriding the new one.
    const storedSort = window.localStorage.getItem("insights:sort-v2");
    if (
      storedSort === "liked" ||
      storedSort === "newest" ||
      storedSort === "shuffle"
    ) {
      setSort(storedSort);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("insights:view", view);
  }, [view]);

  useEffect(() => {
    // "Oldest" is an admin-only clean-up view. Never persist it, or a later
    // normal visit would load into it.
    if (sort !== "oldest") window.localStorage.setItem("insights:sort-v2", sort);
  }, [sort]);

  const hideLink = async (link: EnrichedLink) => {
    if (!isAdmin) return;
    if (!window.confirm(`Hide “${link.title}” from every surface?`)) return;
    const response = await fetch("/api/v1/links/hide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: link.url }),
    });
    if (response.status === 401) {
      loseAdminSession();
      return;
    }
    if (response.ok) {
      setHiddenKeys((prev) => new Set(prev).add(normalizeUrl(link.url)));
      feedback.press();
      // Re-render server components so the header count drops too.
      router.refresh();
    }
  };

  // A card shows the shader while it's on screen and its screenshot isn't ready
  // yet. Off-screen cards render nothing, so only the cards in view ever run a
  // shader (keeps well under the browser's WebGL context limit).
  const [visibleUrls, setVisibleUrls] = useState<Set<string>>(new Set());
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const visibleRef = useRef<Set<string>>(new Set());
  const refreshedRef = useRef<Set<string>>(new Set());
  const feedback = useFeedback();

  // Open an article in the reader overlay; Back/Escape closes it. History gets
  // an entry so the browser's back button returns to the list exactly as left.
  const openReader = (link: EnrichedLink) => {
    window.history.pushState({ reader: link.urlKey }, "");
    setReading(link.urlKey);
  };

  const closeReader = useCallback(() => {
    if ((window.history.state as { reader?: string } | null)?.reader) {
      window.history.back();
    } else {
      setReading(null);
    }
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { reader?: string } | null;
      setReading(state?.reader ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const loadPreview = async (
    url: string,
    refresh: boolean,
    attempt = 0
  ): Promise<void> => {
    let responded = false;
    try {
      const response = await fetch(
        `/api/link-preview?url=${encodeURIComponent(url)}${
          refresh ? "&refresh=1" : ""
        }&json=1`
      );
      responded = true;
      const data = response.ok
        ? ((await response.json()) as { preview?: string })
        : null;
      if (!data?.preview) throw new Error("no preview");
      const preview = data.preview;
      setPreviewMap((prev) => ({ ...prev, [url]: preview }));
    } catch {
      // Retry a genuine network failure once. A server error or timeout won't
      // get better, so fail fast instead of leaving the shader spinning.
      if (!responded && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return loadPreview(url, refresh, 1);
      }
      setFailedUrls((prev) => new Set(prev).add(url));
    }
  };

  const runQueue = () => {
    while (runningRef.current < 3 && queueRef.current.length > 0) {
      const job = queueRef.current.shift();
      if (!job) break;
      runningRef.current += 1;
      loadPreview(job.url, job.refresh).finally(() => {
        runningRef.current -= 1;
        runQueue();
      });
    }
  };

  const enqueue = (url: string, refresh = false) => {
    if (!url) return;
    if (queueRef.current.some((job) => job.url === url)) return;
    queueRef.current.push({ url, refresh });
    runQueue();
  };

  const warmPreview = (url: string) => {
    if (!url || previewMap[url] || warmedRef.current.has(url)) return;
    warmedRef.current.add(url);
    enqueue(url);
  };

  // A stored preview that fails to load is stale: drop it so the shader shows
  // again, and capture a fresh one. Only once per link — a broken URL must not
  // turn into an endless re-capture loop.
  const refreshPreview = (url: string) => {
    setPreviewMap((prev) => {
      if (!prev[url]) return prev;
      const next = { ...prev };
      delete next[url];
      return next;
    });

    if (refreshedRef.current.has(url)) {
      setFailedUrls((prev) => new Set(prev).add(url));
      return;
    }
    refreshedRef.current.add(url);

    setFailedUrls((prev) => {
      if (!prev.has(url)) return prev;
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    setVisibleUrls((prev) => new Set(prev).add(url));
    warmedRef.current.delete(url);
    enqueue(url, true);
  };

  const warmRef = useRef(warmPreview);
  warmRef.current = warmPreview;

  // Seed the first few on mount.
  useEffect(() => {
    links
      .map((link) => link.url)
      .filter(Boolean)
      .slice(0, 8)
      .forEach((url) => warmRef.current(url));
    // Run once on mount against the initial (all) list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Work out which cards are on screen (only those mount a shader). A plain
  // rect check on scroll is deterministic — no reliance on observer quirks.
  useEffect(() => {
    if (view !== "grid") return;
    const container = gridRef.current;
    if (!container) return;

    let frame: number | null = null;

    const update = () => {
      frame = null;
      const next = new Set<string>();
      const entering: string[] = [];

      for (const element of Array.from(
        container.querySelectorAll<HTMLElement>("[data-warm-url]")
      )) {
        const url = element.dataset.warmUrl;
        if (!url) continue;
        const rect = element.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (!inView) continue;
        next.add(url);
        if (!visibleRef.current.has(url)) entering.push(url);
      }

      visibleRef.current = next;
      setVisibleUrls(next);
      entering.forEach((url) => warmRef.current(url));
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [view, sortedLinks, visibleItems]);

  // Everything the current filter/search shows, minus what we've hidden this
  // session. `visibleLinks` is just the current page of it.
  const selectableLinks = sortedLinks.filter(
    (link) => !hiddenKeys.has(normalizeUrl(link.url))
  );
  const visibleLinks = selectableLinks.slice(0, visibleItems);

  // --- Clean-up (batch delete) -------------------------------------------
  // Selection is inert: it never touches the list, so nothing reflows while I
  // am picking. The only reflow is the single batch commit.

  const toggleSelected = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllShown = () =>
    setSelected(new Set(selectableLinks.map((link) => link.url)));

  const toggleCleanup = () => {
    feedback.select();
    if (!cleanup) {
      setCleanup(true);
      return;
    }
    // Leaving is the one moment the list may change. Refresh once, here — never
    // mid-triage — so the order can't jump under a click and the header count
    // catches up in one go.
    setCleanup(false);
    setSelected(new Set());
    setLastHidden(null);
    router.refresh();
  };

  // Split a selection into API-sized chunks and fire them together.
  const sendHideBatch = (endpoint: string, urls: string[]) => {
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += HIDE_BATCH_LIMIT) {
      batches.push(urls.slice(i, i + HIDE_BATCH_LIMIT));
    }
    return Promise.all(
      batches.map((batch) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urls: batch }),
        })
      )
    );
  };

  // A 401 means the session expired: drop the admin chrome everywhere at once.
  const loseAdminSession = () => {
    setIsAdmin(false);
    setCleanup(false);
    window.alert("Admin session expired. Sign in again at /login.");
  };

  const hideSelected = async () => {
    if (!isAdmin || selected.size === 0) return;
    const urls = Array.from(selected);
    const responses = await sendHideBatch("/api/v1/links/hide", urls);
    if (responses.some((response) => response.status === 401)) {
      loseAdminSession();
      return;
    }
    if (responses.some((response) => !response.ok)) {
      // A batch failed part-way. Resync from the server instead of guessing
      // which links made it — correctness beats avoiding one rare reflow.
      feedback.warning();
      router.refresh();
      return;
    }
    // One state update for the whole batch: a single reflow, on my terms.
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      urls.forEach((url) => next.add(normalizeUrl(url)));
      return next;
    });
    setSelected(new Set());
    setLastHidden(urls);
    feedback.press();
  };

  const undoHide = async () => {
    if (!isAdmin || !lastHidden) return;
    const urls = lastHidden;
    const responses = await sendHideBatch("/api/v1/links/unhide", urls);
    if (responses.some((response) => response.status === 401)) {
      loseAdminSession();
      return;
    }
    if (responses.some((response) => !response.ok)) {
      feedback.warning();
      router.refresh();
      return;
    }
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      urls.forEach((url) => next.delete(normalizeUrl(url)));
      return next;
    });
    setLastHidden(null);
    feedback.press();
  };

  return (
    <PreviewCardProvider>
      <div>
      {/* App bar — view toggle on the left; filters and search on the right.
          Sticks to the top of the panel: the frame is a rail on the left and a
          tab bar at the bottom, so nothing is above it to fight for the edge
          (the floating navbar used to duck out of the way for this). */}
      <div className="sticky-tabs -mx-5 flex items-center justify-between gap-3 bg-background px-5 py-3 sm:-mx-6 sm:px-6">
        {/* Display choices sit on the left. Batch delete lives in the sort menu
            instead — it is an admin action, not a view, and on a phone the
            toolbar has no room to spare. */}
        <div className={`${searchOpen ? "hidden sm:block" : "block"} shrink-0`}>
          <div className="flex h-10 items-center gap-2 sm:h-9">
            <div className="flex h-full items-center gap-0.5 rounded-lg border border-border p-0.5">
              {[
                { mode: "list" as const, label: "List view", Icon: ListIcon },
                { mode: "grid" as const, label: "Grid view", Icon: LayoutGrid },
              ].map(({ mode, label, Icon }) => {
                const active = view === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      feedback.select();
                      setView(mode);
                    }}
                    aria-label={label}
                    aria-pressed={active}
                    className={`relative flex h-full aspect-square items-center justify-center rounded-[5px] transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="insights-view-pill"
                        className="absolute inset-0 rounded-[5px] bg-foreground/10"
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 42,
                        }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters + search */}
        <div
          className={`flex items-center gap-2 ${searchOpen ? "flex-1" : ""}`}
        >
          {!searchOpen && (
            <>
              <div ref={filterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={filterMenuOpen}
                  aria-label={`Filter: ${activeFilterLabel}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 sm:hidden" />
                  <span className="hidden max-w-[7rem] truncate sm:inline">
                    {activeFilterLabel}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-faint-foreground transition-transform ${
                      filterMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {filterMenuOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 top-full z-30 mt-1 max-h-[min(80svh,26rem)] w-auto min-w-[8rem] max-w-[min(72vw,13rem)] overflow-y-auto overscroll-contain rounded-lg [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar]:w-1.5 border border-border bg-background p-1 shadow-lg shadow-black/5"
                  >
                    {filters.map((filter) => (
                      <button
                        key={filter.name}
                        type="button"
                        role="option"
                        aria-selected={activeCategory === filter.name}
                        onClick={() => {
                          feedback.select();
                          setActiveCategory(filter.name);
                          setFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-3 py-1.5 text-left type-caption transition-colors sm:py-2 ${
                          activeCategory === filter.name
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        }`}
                      >
                        {filter.label}
                        {activeCategory === filter.name && (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Topics — a picker, not a cloud: the head is listed, the long
                  tail is a search away. Either-of semantics. */}
              <div ref={topicsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTopicsOpen((open) => !open)}
                  aria-haspopup="dialog"
                  aria-expanded={topicsOpen}
                  aria-label="Filter by topic"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9"
                >
                  <Tag className="h-4 w-4 shrink-0 sm:hidden" />
                  <span className="hidden sm:inline">Topics</span>
                  {selectedTopics.length > 0 && (
                    <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">
                      {selectedTopics.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-faint-foreground transition-transform ${
                      topicsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {topicsOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1 flex max-h-[min(55svh,18rem)] w-[min(72vw,11.5rem)] flex-col overflow-hidden overscroll-contain rounded-lg [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar]:w-1.5 border border-border bg-background p-1 shadow-lg shadow-black/5">
                    <div className="p-1">
                      <input
                        type="text"
                        value={topicQuery}
                        onChange={(event) => setTopicQuery(event.target.value)}
                        placeholder="Find a topic"
                        spellCheck={false}
                        aria-label="Find a topic"
                        className="h-8 w-full rounded-md border border-border bg-transparent px-2.5 text-sm outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30"
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      {topicOptions.length === 0 ? (
                        <p className="px-3 py-2 type-caption text-muted-foreground">
                          No topics match “{topicQuery}”.
                        </p>
                      ) : (
                        topicOptions.map(([topic, count]) => {
                          const active = selectedTopics.includes(topic);
                          return (
                            <button
                              key={topic}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => toggleTopic(topic)}
                              className={`flex w-full items-center justify-between gap-1.5 rounded-[3px] px-2 py-1.5 text-left type-caption transition-colors ${
                                active
                                  ? "bg-foreground/[0.06] text-foreground"
                                  : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                                    active
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-muted-foreground/40"
                                  }`}
                                >
                                  {active && <Check className="h-2.5 w-2.5" />}
                                </span>
                                <span className="truncate">{topic}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-faint-foreground">
                                {count}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {selectedTopics.length > 0 && (
                      <div className="mt-1 border-t border-border p-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTopics([])}
                          className="w-full rounded-[3px] px-3 py-1.5 text-left type-caption text-muted-foreground transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
                        >
                          Clear topics
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort — recency, quality, or a shuffle */}
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={sortMenuOpen}
                  aria-label={`Sort: ${SORT_LABELS[sort]}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-2.5 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9 sm:px-3"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-faint-foreground" />
                  <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
                  <ChevronDown
                    className={`hidden h-3.5 w-3.5 shrink-0 text-faint-foreground transition-transform sm:block ${
                      sortMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {sortMenuOpen && (
                  <div
                    role="listbox"
                    className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-background p-1 shadow-lg shadow-black/5"
                  >
                    {[
                      { value: "newest" as const, label: "Newest", icon: Clock },
                      {
                        value: "liked" as const,
                        label: "Most liked",
                        icon: Heart,
                      },
                      {
                        value: "shuffle" as const,
                        label: "Shuffle",
                        icon: Shuffle,
                      },
                      // Oldest is a clean-up tool, so it only exists for admins.
                      ...(isAdmin
                        ? [
                            {
                              value: "oldest" as const,
                              label: "Oldest",
                              icon: History,
                            },
                          ]
                        : []),
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={sort === option.value}
                        onClick={() => {
                          feedback.select();
                          setSort(option.value);
                          setSortMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-3 py-1.5 text-left type-caption transition-colors sm:py-2 ${
                          sort === option.value
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <option.icon className="h-3.5 w-3.5" />
                          {option.label}
                        </span>
                        {sort === option.value && (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    ))}

                    {/* Batch delete is an admin action, so it lives here rather
                        than taking a slot in the toolbar. */}
                    {isAdmin && (
                      <>
                        <div className="my-1 h-px bg-border" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => {
                            feedback.select();
                            setSortMenuOpen(false);
                            toggleCleanup();
                          }}
                          className={`flex w-full items-center gap-2 rounded-[3px] px-3 py-1.5 text-left type-caption transition-colors sm:py-2 ${
                            cleanup
                              ? "text-red-600"
                              : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                          }`}
                        >
                          {cleanup ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {cleanup ? "Done cleaning up" : "Clean up links"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile: search lives behind an icon until opened. */}
          <button
            type="button"
            onClick={() => {
              feedback.select();
              setSearchOpen((open) => !open);
            }}
            aria-label={searchOpen ? "Close search" : "Search links"}
            aria-expanded={searchOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground sm:hidden"
          >
            {searchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>

          <div
            className={`relative ${searchOpen ? "flex-1" : "hidden"} sm:block sm:w-56`}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search…"
              spellCheck={false}
              aria-label="Search links"
              autoFocus={searchOpen}
              className="h-10 w-full rounded-lg border border-border bg-transparent pl-9 pr-3 text-base outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30 sm:h-9 sm:text-sm"
            />
          </div>
        </div>

        <div
          className="rule absolute inset-x-5 bottom-0 w-auto sm:inset-x-6"
          aria-hidden="true"
        />
      </div>

      {/* Add a link. Only for admins, and only inside a real category: you
          pick the tab first, then drop. */}
      {isAdmin && activeCategory !== "all" && (
        <AddLinkComposer
          category={activeCategory}
          onAdded={() => router.refresh()}
          onUnauthorized={loseAdminSession}
        />
      )}

      {/* Active topics: only exist when a filter is on — chips as a receipt. */}
      {selectedTopics.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 px-3">
          {selectedTopics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => toggleTopic(topic)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.03] px-2.5 py-1 type-caption text-foreground transition-colors hover:bg-foreground/[0.07]"
              aria-label={`Remove topic ${topic}`}
            >
              {topic}
              <X className="h-3 w-3 text-faint-foreground transition-colors group-hover:text-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedTopics([])}
            className="type-caption text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Links */}
      <div className="mt-6">
        {visibleLinks.length === 0 ? (
          <p className="px-3 py-10 text-center type-caption">
            Nothing matches these filters.
            {selectedTopics.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTopics([])}
                className="ml-2 font-medium text-foreground underline-offset-4 hover:underline"
              >
                Clear topics
              </button>
            )}
          </p>
        ) : view === "list" ? (
          <>
            <div className="flex items-center gap-3 px-3 pb-3 type-body text-muted-foreground">
              <span className="w-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">Name</span>
              <span className="hidden w-44 shrink-0 sm:block">Site</span>
              <span className="w-24 shrink-0 text-right">
                {cleanup ? "" : "Likes"}
              </span>
            </div>
            <div className="rule" aria-hidden="true" />

            <div className="flex flex-col">
              {visibleLinks.map((link, index) => {
                const href = hrefFor(link);

                return (
                  <div key={link.id}>
                    {index > 0 && <div className="rule" aria-hidden="true" />}
                    <FadeIn delay={Math.min(index, 12) * 0.03}>
                      <LinkRow
                        link={link}
                        href={href}
                        onRead={
                          link.category === "article"
                            ? () => openReader(link)
                            : undefined
                        }
                        previewSrc={
                          previewMap[link.url] ??
                          `/api/link-preview?url=${encodeURIComponent(link.url)}`
                        }
                        isAdmin={isAdmin}
                        onHide={() => hideLink(link)}
                        selectMode={cleanup}
                        selected={selected.has(link.url)}
                        onToggle={() => toggleSelected(link.url)}
                      />
                    </FadeIn>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visibleLinks.map((link, index) => {
              const href = hrefFor(link);

              return (
                <FadeIn
                  key={link.id}
                  className="h-full"
                  delay={Math.min(index, 12) * 0.03}
                >
                  <LinkGridCard
                    link={link}
                    href={href}
                    onRead={
                      link.category === "article"
                        ? () => openReader(link)
                        : undefined
                    }
                    previewSrc={previewMap[link.url]}
                    isVisible={visibleUrls.has(link.url)}
                    isFailed={failedUrls.has(link.url)}
                    onPreviewError={() => refreshPreview(link.url)}
                    warmUrl={previewMap[link.url] ? undefined : link.url}
                    isAdmin={isAdmin}
                    onHide={() => hideLink(link)}
                    selectMode={cleanup}
                    selected={selected.has(link.url)}
                    onToggle={() => toggleSelected(link.url)}
                  />
                </FadeIn>
              );
            })}
          </div>
        )}

        {selectableLinks.length > visibleItems && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                feedback.press();
                setVisibleItems((prev) => prev + ITEMS_PER_PAGE);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9"
            >
              Show {Math.min(ITEMS_PER_PAGE, selectableLinks.length - visibleItems)}{" "}
              more
            </button>
          </div>
        )}
      </div>

      {/* Clean-up rail. Sticky so it rides the viewport without entering the
          document flow — appearing or leaving never shifts the list. Sits above
          the phone tab bar, and at the bottom edge on desktop. */}
      {(cleanup || lastHidden) && isAdmin && (
        <div className="sticky bottom-[var(--tabbar-space)] z-30 mt-4 flex flex-col gap-2">
          {lastHidden && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur">
              <span className="type-caption text-muted-foreground">
                Hidden {lastHidden.length}{" "}
                {lastHidden.length === 1 ? "link" : "links"}.
              </span>
              <button
                type="button"
                onClick={undoHide}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                Undo
              </button>
            </div>
          )}

          {cleanup && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="type-caption font-medium text-foreground">
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  onClick={selectAllShown}
                  disabled={selectableLinks.length === 0}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
                >
                  All {selectableLinks.length}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selected.size === 0}
                  className="inline-flex h-8 items-center rounded-lg px-2 type-caption font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                onClick={hideSelected}
                disabled={selected.size === 0}
                aria-label={`Hide ${selected.size} selected`}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 type-caption font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hide{selected.size > 0 ? ` ${selected.size}` : ""}
              </button>
            </div>
          )}
        </div>
      )}

      </div>

      <AnimatePresence>
        {reading && (
          <ReaderView
            key={reading}
            urlKey={reading}
            isAdmin={isAdmin}
            onClose={closeReader}
          />
        )}
      </AnimatePresence>
    </PreviewCardProvider>
  );
}

/**
 * Add a link to the category you are looking at. Drop or paste a URL; the
 * pipeline reads and summarizes it in the background.
 */
function AddLinkComposer({
  category,
  onAdded,
  onUnauthorized,
}: {
  category: string;
  onAdded: () => void;
  onUnauthorized: () => void;
}) {
  const feedback = useFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  const label = categoryLabel(category);
  const busy = status === "adding";

  const submit = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    setStatus("adding");
    setMessage("");
    try {
      const response = await fetch("/api/v1/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value, category }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Could not add that link.");
        return;
      }
      feedback.press();
      setStatus("added");
      setMessage(
        `Added “${data?.data?.title || value}”. It will be summarized in a moment.`
      );
      setUrl("");
      onAdded();
      inputRef.current?.focus();
    } catch {
      setStatus("error");
      setMessage("Could not add that link.");
    }
  };

  return (
    <div className="mt-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped =
            event.dataTransfer.getData("text/uri-list") ||
            event.dataTransfer.getData("text/plain");
          if (!dropped) return;
          setUrl(dropped);
          void submit(dropped);
        }}
        className={`rounded-lg border transition-all duration-200 ${
          dragging
            ? "border-green-600/50 bg-green-600/[0.06] ring-2 ring-green-600/15"
            : "border-border bg-foreground/[0.02] focus-within:border-input focus-within:ring-2 focus-within:ring-ring/30"
        }`}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(url);
          }}
          className="flex items-center gap-1 p-1.5"
        >
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center transition-colors ${
              dragging || status === "added"
                ? "text-green-700 dark:text-green-500"
                : "text-faint-foreground"
            }`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === "added" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder={
              dragging ? "Drop to add…" : `Drop or paste a link into ${label}`
            }
            spellCheck={false}
            autoComplete="off"
            aria-label={`Add a link to ${label}`}
            className="min-h-9 min-w-0 flex-1 bg-transparent px-1 text-base leading-normal outline-none placeholder:text-faint-foreground sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || url.trim() === ""}
            aria-label={`Add to ${label}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>

      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role={status === "error" ? "alert" : undefined}
            className={`mt-2 px-1 type-caption ${
              status === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Copy the link, tracking stripped. Hover-revealed on desktop; always on for
 * touch, where there is no hover to reveal it. The clipboard itself is the
 * shared CopyButton — one implementation for docs and the collection.
 */
const COPY_VISIBILITY =
  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100";

function CopyLinkButton({ url }: { url: string }) {
  const feedback = useFeedback();
  return (
    <CopyButton
      iconOnly
      value={cleanShareUrl(url)}
      label="clean link"
      className={COPY_VISIBILITY}
      onCopied={feedback.press}
    />
  );
}

/** The clean-up selection mark. Purely visual — the row or card around it owns
 *  the click, so there is one hit target and no double toggle. */
function SelectBox({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-muted-foreground/50 bg-background/60"
      } ${className ?? ""}`}
    >
      {selected && <Check className="h-3 w-3" />}
    </span>
  );
}

function LinkRow({
  link,
  href,
  previewSrc,
  isAdmin,
  onHide,
  selectMode,
  selected,
  onToggle,
  onRead,
}: {
  link: EnrichedLink;
  href: string;
  previewSrc: string;
  isAdmin: boolean;
  onHide: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onRead?: () => void;
}) {
  const lead = (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5">
      {selectMode ? (
        <SelectBox selected={selected} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconFor(link.url)}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          className="h-4 w-4 object-contain"
        />
      )}
    </span>
  );

  const title = (
    <span className="min-w-0 flex-1 truncate type-body font-semibold text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
      {link.title}
    </span>
  );

  const domain = (
    <span className="hidden w-44 shrink-0 truncate type-body text-muted-foreground sm:block">
      {shortDomain(link.url)}
    </span>
  );

  // In clean-up mode the whole row is the toggle: the link, the preview and the
  // like button stand down, so a tap can only mean "select". The trailing
  // spacer keeps the columns aligned with the header, so selecting shifts
  // nothing.
  if (selectMode) {
    return (
      <div
        className={`flex w-full items-center gap-3 px-3 py-4 transition-colors ${
          selected ? "bg-foreground/[0.06]" : "hover:bg-foreground/5"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {lead}
          {title}
          {domain}
        </button>
        {/* Inspecting before deleting is allowed: the row area toggles, this
            opens. A sibling of the toggle, never nested inside it, so one click
            can only do one thing. */}
        <div className="flex w-24 shrink-0 items-center justify-end">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link in a new tab"
            title="Open link"
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-foreground/5 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <PreviewCardTrigger
      payload={{ url: link.url, name: link.title, previewImage: previewSrc }}
      className="group flex items-center gap-3 px-3 py-4 transition-colors hover:bg-foreground/5"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={
          onRead
            ? (event) => {
                // Left-click reads in place; middle/ctrl-click still opens the site.
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  event.preventDefault();
                  onRead();
                }
              }
            : undefined
        }
        onMouseEnter={
          // Hover warms the article, so the click opens instantly.
          onRead ? () => prefetchArticle(link.urlKey) : undefined
        }
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {lead}
        {title}
        {domain}
      </a>

      <div className="flex w-24 shrink-0 items-center justify-end gap-1.5">
        <CopyLinkButton url={link.url} />
        {isAdmin && (
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide link"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <LikeButton linkId={link.id} />
      </div>
    </PreviewCardTrigger>
  );
}

function LinkGridCard({
  link,
  href,
  previewSrc,
  isVisible,
  isFailed,
  onPreviewError,
  warmUrl,
  isAdmin,
  onHide,
  selectMode,
  selected,
  onToggle,
  onRead,
}: {
  link: EnrichedLink;
  href: string;
  previewSrc?: string;
  isVisible?: boolean;
  isFailed?: boolean;
  onPreviewError: () => void;
  warmUrl?: string;
  isAdmin: boolean;
  onHide: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onRead?: () => void;
}) {
  const media = (
    <div className="relative aspect-[40/21] w-full overflow-hidden bg-secondary">
      {selectMode && (
        <span className="absolute left-2 top-2 z-10">
          <SelectBox selected={selected} />
        </span>
      )}
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          loading="lazy"
          onError={onPreviewError}
          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : isVisible && !isFailed ? (
        <PreviewLoader />
      ) : (
        // Couldn't capture this one (site blocks bots / is unreachable).
        // A quiet mark beats an empty panel.
        <div className="flex h-full w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconFor(link.url)}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            className="h-7 w-7 rounded object-contain opacity-40"
          />
        </div>
      )}
    </div>
  );

  const body = (
    <div className="p-3">
      <div className="line-clamp-2 type-body font-medium leading-snug text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
        {link.title}
      </div>
    </div>
  );

  const footer = (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
      <span className="truncate type-caption text-faint-foreground">
        {shortDomain(link.url)}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {!selectMode && isAdmin && (
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide link"
            className="text-muted-foreground transition-colors hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {selectMode ? (
          // Same rule as the row: the card toggles, this opens.
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link in a new tab"
            title="Open link"
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-foreground/5 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="flex items-center gap-1">
            <CopyLinkButton url={link.url} />
            <LikeButton linkId={link.id} />
          </span>
        )}
      </div>
    </div>
  );

  // Same idea as the row: the card becomes the toggle. The checkbox is absolute,
  // so it costs no layout, and the link does not open.
  if (selectMode) {
    return (
      <div
        data-warm-url={warmUrl}
        className={`flex h-full flex-col overflow-hidden rounded-xl border bg-background transition-colors ${
          selected
            ? "border-foreground ring-2 ring-foreground/50"
            : "border-border hover:border-foreground/20"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          className="flex w-full flex-1 flex-col text-left"
        >
          {media}
          {body}
        </button>
        {footer}
      </div>
    );
  }

  return (
    <div
      data-warm-url={warmUrl}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20"
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={
          onRead
            ? (event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  event.preventDefault();
                  onRead();
                }
              }
            : undefined
        }
        onMouseEnter={
          onRead ? () => prefetchArticle(link.urlKey) : undefined
        }
        className="flex flex-1 flex-col"
      >
        {media}
        {body}
      </a>
      {footer}
    </div>
  );
}