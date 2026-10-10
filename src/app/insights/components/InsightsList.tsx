"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";
import { ArrowUpDown, Check, ChevronDown, Clock, Heart, History, LayoutGrid, List as ListIcon, Search, Shuffle, Trash2, X } from "lucide-react";
import { DiscordChannel, LinkData } from "../utils/discordApi";
import {
  appendUTMParams,
  dedupeByUrl,
  normalizeUrl,
  seededShuffle,
  sortByNewestId,
  sortByOldestId,
} from "../utils/urlUtils";
import { CHANNEL_LABELS, CHANNEL_ORDER } from "../utils/channels";
import { LikeButton } from "./LikeButton";
import { FadeIn } from "@/components/FadeIn";
import {
  PreviewCardProvider,
  PreviewCardTrigger,
} from "@/components/ui/PreviewCard";
import { PreviewLoader } from "@/components/ui/PreviewLoader";

interface InsightsListProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
  previews: Record<string, string>;
  likeCounts: Record<string, number>;
  shuffleSeed: number;
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

type EnrichedLink = LinkData & { category?: string };

export default function InsightsList({
  channels,
  linkData,
  previews,
  likeCounts,
  shuffleSeed,
}: InsightsListProps) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortMode>("shuffle");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [adminKey, setAdminKey] = useState<string | null>(null);
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

  const sortedChannels = useMemo(
    () =>
      channels
        // Only surface channels we have a label/order for. Anything else
        // (e.g. a stale cached channel list) would otherwise leak in as a raw
        // channel name like "opportunities".
        .filter((channel) => channel.name in CHANNEL_LABELS)
        .sort(
          (a, b) =>
            CHANNEL_ORDER.indexOf(a.name) - CHANNEL_ORDER.indexOf(b.name)
        ),
    [channels]
  );

  const filters = useMemo(
    () => [
      { name: "all", label: "All" },
      ...sortedChannels.map((channel) => ({
        name: channel.name,
        label: CHANNEL_LABELS[channel.name],
      })),
    ],
    [sortedChannels]
  );

  const activeFilterLabel =
    filters.find((filter) => filter.name === activeChannel)?.label ?? "All";

  // Every link in the active view, newest first.
  const links = useMemo<EnrichedLink[]>(() => {
    const source: EnrichedLink[] =
      activeChannel === "all"
        ? sortedChannels.flatMap((channel) =>
            (linkData[channel.name] || []).map((link) => ({
              ...link,
              category: channel.name,
            }))
          )
        : (linkData[activeChannel] || []).map((link) => ({
            ...link,
            category: activeChannel,
          }));

    // Newest first, then collapse the same URL posted to more than one
    // channel so a link never appears twice in a view.
    return dedupeByUrl(sortByNewestId(source));
  }, [activeChannel, sortedChannels, linkData]);

  const filteredLinks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return links;
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query)
    );
  }, [links, searchTerm]);

  // Quality sort keeps newest-first order for ties (Array.sort is stable).
  const sortedLinks = useMemo(() => {
    if (sort === "newest") return filteredLinks;
    if (sort === "oldest") return sortByOldestId(filteredLinks);
    if (sort === "shuffle") return seededShuffle(filteredLinks, shuffleSeed);
    return [...filteredLinks].sort(
      (a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0)
    );
  }, [filteredLinks, sort, likeCounts, shuffleSeed]);

  useEffect(() => {
    setVisibleItems(ITEMS_PER_PAGE);
  }, [activeChannel, searchTerm, sort, view]);

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

  // Admin mode: ?admin in the URL; the key is prompted once and stored in
  // this browser only. Hiding is reversible server-side (hidden_at).
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("admin")) return;
    const stored = window.localStorage.getItem("insights_admin_key");
    const key =
      stored ?? window.prompt("Admin key (stored in this browser only)");
    if (key) {
      window.localStorage.setItem("insights_admin_key", key);
      setAdminKey(key);
    }
  }, []);

  const hideLink = async (link: EnrichedLink) => {
    if (!adminKey) return;
    if (!window.confirm(`Hide “${link.title}” from every surface?`)) return;
    const response = await fetch("/api/v1/links/hide", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ url: link.url }),
    });
    if (response.status === 401) {
      window.localStorage.removeItem("insights_admin_key");
      setAdminKey(null);
      window.alert("Wrong admin key.");
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
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify({ urls: batch }),
        })
      )
    );
  };

  // A 401 anywhere means the stored key is wrong: drop it everywhere at once.
  const rejectAdminKey = () => {
    window.localStorage.removeItem("insights_admin_key");
    setAdminKey(null);
    setCleanup(false);
    window.alert("Wrong admin key.");
  };

  const hideSelected = async () => {
    if (!adminKey || selected.size === 0) return;
    const urls = Array.from(selected);
    const responses = await sendHideBatch("/api/v1/links/hide", urls);
    if (responses.some((response) => response.status === 401)) {
      rejectAdminKey();
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
    if (!adminKey || !lastHidden) return;
    const urls = lastHidden;
    const responses = await sendHideBatch("/api/v1/links/unhide", urls);
    if (responses.some((response) => response.status === 401)) {
      rejectAdminKey();
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
        {/* View toggle + clean-up. Display choices sit on the left; clean-up is
            the admin-only door into batch delete. */}
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

            {adminKey !== null && (
              <button
                type="button"
                onClick={toggleCleanup}
                aria-pressed={cleanup}
                aria-label={cleanup ? "Done cleaning up" : "Clean up links"}
                title={cleanup ? "Done cleaning up" : "Clean up links"}
                className={`flex aspect-square h-full items-center justify-center rounded-lg border transition-colors ${
                  cleanup
                    ? "border-red-600/40 bg-red-600/10 text-red-600"
                    : "border-border text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {cleanup ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
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
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9"
                >
                  <span className="max-w-[7rem] truncate">
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
                    className="absolute right-0 top-full z-30 mt-1 max-h-80 w-52 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg shadow-black/5"
                  >
                    {filters.map((filter) => (
                      <button
                        key={filter.name}
                        type="button"
                        role="option"
                        aria-selected={activeChannel === filter.name}
                        onClick={() => {
                          feedback.select();
                          setActiveChannel(filter.name);
                          setFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-3 py-2 text-left type-caption transition-colors ${
                          activeChannel === filter.name
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        }`}
                      >
                        {filter.label}
                        {activeChannel === filter.name && (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    ))}
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
                      ...(adminKey !== null
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
                        className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-3 py-2 text-left type-caption transition-colors ${
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

      {/* Links */}
      <div className="mt-6">
        {visibleLinks.length === 0 ? (
          <p className="px-3 py-10 text-center type-caption">
            No links match “{searchTerm}”.
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
                const href = appendUTMParams(link.url, {
                  utm_source: "souravinsights.com",
                  utm_medium: "curated_links",
                });

                return (
                  <div key={link.id}>
                    {index > 0 && <div className="rule" aria-hidden="true" />}
                    <FadeIn delay={Math.min(index, 12) * 0.03}>
                      <LinkRow
                        link={link}
                        href={href}
                        previewSrc={
                          previewMap[link.url] ??
                          `/api/link-preview?url=${encodeURIComponent(link.url)}`
                        }
                        isAdmin={adminKey !== null}
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
              const href = appendUTMParams(link.url, {
                utm_source: "souravinsights.com",
                utm_medium: "curated_links",
              });

              return (
                <FadeIn
                  key={link.id}
                  className="h-full"
                  delay={Math.min(index, 12) * 0.03}
                >
                  <LinkGridCard
                    link={link}
                    href={href}
                    previewSrc={previewMap[link.url]}
                    isVisible={visibleUrls.has(link.url)}
                    isFailed={failedUrls.has(link.url)}
                    onPreviewError={() => refreshPreview(link.url)}
                    warmUrl={previewMap[link.url] ? undefined : link.url}
                    isAdmin={adminKey !== null}
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
      {(cleanup || lastHidden) && adminKey !== null && (
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
    </PreviewCardProvider>
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
}: {
  link: EnrichedLink;
  href: string;
  previewSrc: string;
  isAdmin: boolean;
  onHide: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
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
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`flex w-full items-center gap-3 px-3 py-4 text-left transition-colors ${
          selected ? "bg-foreground/[0.06]" : "hover:bg-foreground/5"
        }`}
      >
        {lead}
        {title}
        {domain}
        <span className="w-24 shrink-0" aria-hidden="true" />
      </button>
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
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {lead}
        {title}
        {domain}
      </a>

      <div className="flex w-24 shrink-0 items-center justify-end gap-2">
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
        {!selectMode && <LikeButton linkId={link.id} />}
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
        className="flex flex-1 flex-col"
      >
        {media}
        {body}
      </a>
      {footer}
    </div>
  );
}