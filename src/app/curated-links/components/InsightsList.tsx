"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, Clock, Heart, LayoutGrid, List as ListIcon, Pencil, Search, X } from "lucide-react";
import { DiscordChannel, LinkData } from "../utils/discordApi";
import {
  appendUTMParams,
  dedupeByUrl,
  normalizeUrl,
  sortByNewestId,
} from "../utils/urlUtils";
import { NoteEditorModal } from "./NoteEditorModal";
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
}

/** Human labels for the Discord channel names. */
const CHANNEL_LABELS: Record<string, string> = {
  "reading-list": "Articles",
  resources: "Resources",
  "product-hunt": "Products",
  newsletters: "Newsletters",
  "fav-portfolios": "Portfolios",
  tools: "Tools",
  "design-inspo": "Design",
};

const CHANNEL_ORDER = [
  "reading-list",
  "resources",
  "product-hunt",
  "newsletters",
  "fav-portfolios",
  "tools",
  "design-inspo",
];

const ITEMS_PER_PAGE = 60;

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
}: InsightsListProps) {
  const [activeChannel, setActiveChannel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [curatedLinks, setCuratedLinks] = useState<LinkData[]>([]);
  const [selectedLinkForEditing, setSelectedLinkForEditing] =
    useState<LinkData | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<"newest" | "liked">("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "grid">("list");
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
    return [...filteredLinks].sort(
      (a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0)
    );
  }, [filteredLinks, sort, likeCounts]);

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
    const storedSort = window.localStorage.getItem("insights:sort");
    if (storedSort === "liked" || storedSort === "newest") setSort(storedSort);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("insights:view", view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem("insights:sort", sort);
  }, [sort]);

  // A card shows the shader while it's on screen and its screenshot isn't ready
  // yet. Off-screen cards render nothing, so only the cards in view ever run a
  // shader (keeps well under the browser's WebGL context limit).
  const [visibleUrls, setVisibleUrls] = useState<Set<string>>(new Set());
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const visibleRef = useRef<Set<string>>(new Set());
  const refreshedRef = useRef<Set<string>>(new Set());

  const loadPreview = async (
    url: string,
    refresh: boolean,
    attempt = 0
  ): Promise<void> => {
    try {
      const response = await fetch(
        `/api/link-preview?url=${encodeURIComponent(url)}${
          refresh ? "&refresh=1" : ""
        }&json=1`
      );
      const data = response.ok
        ? ((await response.json()) as { preview?: string })
        : null;
      if (!data?.preview) throw new Error("no preview");
      const preview = data.preview;
      setPreviewMap((prev) => ({ ...prev, [url]: preview }));
    } catch {
      // One quick retry — a capture can fail on a cold start.
      if (attempt === 0) {
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

  // Admin mode is opt-in via ?adminKey=...
  useEffect(() => {
    const adminKey = new URLSearchParams(window.location.search).get(
      "adminKey"
    );
    if (adminKey && adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setIsAdminMode(true);
    }
  }, []);

  const fetchCuratedLinks = async () => {
    try {
      const response = await fetch("/api/curated-links", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      setCuratedLinks(data.links);
    } catch (error) {
      console.error("Error fetching curated links:", error);
    }
  };

  useEffect(() => {
    if (isAdminMode) fetchCuratedLinks();
  }, [isAdminMode]);

  const openEditor = (link: EnrichedLink) => {
    const curated = curatedLinks.find(
      (item) => normalizeUrl(item.url) === normalizeUrl(link.url)
    );
    setSelectedLinkForEditing({ ...link, ...(curated ?? {}) });
    setIsEditorModalOpen(true);
  };

  const handleSaveNotes = async (
    linkId: string,
    notes: string,
    creatorTwitter?: string
  ) => {
    try {
      await fetch("/api/curated-links/save-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
        },
        body: JSON.stringify({ linkId, notes, creatorTwitter }),
      });
      await fetchCuratedLinks();
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  const addToCollection = async (data: {
    linkId: string;
    notes: string;
    creatorTwitter: string;
    category: string;
  }) => {
    const link = links.find((item) => item.id === data.linkId);
    if (!link) throw new Error("Link not found");

    await fetch("/api/curated-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY}`,
      },
      body: JSON.stringify({
        title: link.title,
        url: link.url,
        description: link.description,
        category: data.category,
        notes: data.notes,
        creatorTwitter: data.creatorTwitter,
      }),
    });
    await fetchCuratedLinks();
  };

  const visibleLinks = sortedLinks.slice(0, visibleItems);

  return (
    <PreviewCardProvider>
      <div>
      {/* App bar — category filter on the left, search on the right. Sticks
          under the navbar, and takes the top edge once the navbar scrolls
          away. */}
      <div className="sticky-tabs -mx-5 flex items-center justify-between gap-3 bg-background px-5 py-3 sm:-mx-6 sm:px-6">
        {!searchOpen && (
          <div className="flex items-center gap-2">
          <div ref={filterMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={filterMenuOpen}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              {activeFilterLabel}
              <ChevronDown
                className={`h-3.5 w-3.5 text-faint-foreground transition-transform ${
                  filterMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {filterMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full z-30 mt-1 max-h-80 w-52 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg shadow-black/5"
              >
                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    type="button"
                    role="option"
                    aria-selected={activeChannel === filter.name}
                    onClick={() => {
                      setActiveChannel(filter.name);
                      setFilterMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left type-caption transition-colors ${
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

          {/* Sort — recency or quality */}
          <div ref={sortMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={sortMenuOpen}
              aria-label={`Sort: ${sort === "newest" ? "Newest" : "Most liked"}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:px-3"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-faint-foreground" />
              <span className="hidden sm:inline">
                {sort === "newest" ? "Newest" : "Most liked"}
              </span>
              <ChevronDown
                className={`hidden h-3.5 w-3.5 text-faint-foreground transition-transform sm:block ${
                  sortMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {sortMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-background p-1 shadow-lg shadow-black/5"
              >
                {[
                  { value: "newest" as const, label: "Newest", icon: Clock },
                  { value: "liked" as const, label: "Most liked", icon: Heart },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={sort === option.value}
                    onClick={() => {
                      setSort(option.value);
                      setSortMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left type-caption transition-colors ${
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
          </div>
        )}

        <div
          className={`flex items-center gap-2 ${searchOpen ? "flex-1" : ""}`}
        >
          {/* View toggle */}
          <div
            className={`${
              searchOpen ? "hidden sm:flex" : "flex"
            } items-center gap-0.5 rounded-lg border border-border p-0.5`}
          >
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "list"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                view === "grid"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile: search lives behind an icon until opened. */}
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? "Close search" : "Search links"}
            aria-expanded={searchOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground sm:hidden"
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
              className="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-base outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30 sm:text-sm"
            />
          </div>
        </div>

        <div
          className="rule absolute inset-x-5 bottom-0 w-auto sm:inset-x-6"
          aria-hidden="true"
        />
      </div>

      {isAdminMode && (
        <div className="mt-4 flex items-center rounded-md border border-border px-3 py-2">
          <span className="type-caption">
            Admin · {curatedLinks.length} curated
          </span>
        </div>
      )}

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
              <span className="w-24 shrink-0 text-right">Likes</span>
            </div>
            <div className="rule" aria-hidden="true" />

            <div className="flex flex-col">
              {visibleLinks.map((link, index) => {
                const isCurated = curatedLinks.some(
                  (item) => normalizeUrl(item.url) === normalizeUrl(link.url)
                );
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
                        isAdminMode={isAdminMode}
                        isCurated={isCurated}
                        onEdit={() => openEditor(link)}
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
              const isCurated = curatedLinks.some(
                (item) => normalizeUrl(item.url) === normalizeUrl(link.url)
              );
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
                    isAdminMode={isAdminMode}
                    isCurated={isCurated}
                    onEdit={() => openEditor(link)}
                    warmUrl={previewMap[link.url] ? undefined : link.url}
                  />
                </FadeIn>
              );
            })}
          </div>
        )}

        {sortedLinks.length > visibleItems && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setVisibleItems((prev) => prev + ITEMS_PER_PAGE)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              Show {Math.min(ITEMS_PER_PAGE, sortedLinks.length - visibleItems)}{" "}
              more
            </button>
          </div>
        )}
      </div>

      <NoteEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        selectedLink={selectedLinkForEditing}
        onSaveNotes={handleSaveNotes}
        onAddToCollection={addToCollection}
        currentCategory={activeChannel}
      />
      </div>
    </PreviewCardProvider>
  );
}

function LinkRow({
  link,
  href,
  previewSrc,
  isAdminMode,
  isCurated,
  onEdit,
}: {
  link: EnrichedLink;
  href: string;
  previewSrc: string;
  isAdminMode: boolean;
  isCurated: boolean;
  onEdit: () => void;
}) {
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
        <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconFor(link.url)}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            className="h-4 w-4 object-contain"
          />
        </span>

        <span className="min-w-0 flex-1 truncate type-body font-semibold text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
          {link.title}
        </span>

        <span className="hidden w-44 shrink-0 truncate type-body text-muted-foreground sm:block">
          {shortDomain(link.url)}
        </span>
      </a>

      <div className="flex w-24 shrink-0 items-center justify-end gap-2">
        {isAdminMode && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={isCurated ? "Edit notes" : "Add to collection"}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
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
  isAdminMode,
  isCurated,
  onEdit,
  warmUrl,
}: {
  link: EnrichedLink;
  href: string;
  previewSrc?: string;
  isVisible?: boolean;
  isFailed?: boolean;
  onPreviewError: () => void;
  isAdminMode: boolean;
  isCurated: boolean;
  onEdit: () => void;
  warmUrl?: string;
}) {
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
        <div className="relative aspect-[40/21] w-full overflow-hidden bg-secondary">
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
          ) : null}
        </div>
        <div className="p-3">
          <div className="line-clamp-2 type-body font-medium leading-snug text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
            {link.title}
          </div>
        </div>
      </a>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <span className="truncate type-caption text-faint-foreground">
          {shortDomain(link.url)}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {isAdminMode && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={isCurated ? "Edit notes" : "Add to collection"}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <LikeButton linkId={link.id} />
        </div>
      </div>
    </div>
  );
}