"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Search, X } from "lucide-react";
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

interface InsightsListProps {
  channels: DiscordChannel[];
  linkData: { [key: string]: LinkData[] };
  previews: Record<string, string>;
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

  useEffect(() => {
    setVisibleItems(ITEMS_PER_PAGE);
  }, [activeChannel, searchTerm]);

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

  // Warm previews for the first links a visitor is likely to hover so the
  // first hover isn't a cold, multi-second capture. Best-effort, low
  // concurrency, and skipped for anything already captured.
  useEffect(() => {
    const missing = links
      .map((link) => link.url)
      .filter((url) => url && !previews[url])
      .slice(0, 8);

    if (missing.length === 0) return;

    let cancelled = false;
    let cursor = 0;

    const worker = async () => {
      while (!cancelled && cursor < missing.length) {
        const url = missing[cursor++];
        try {
          await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
            redirect: "manual",
          });
        } catch {
          // best-effort
        }
      }
    };

    void Promise.all([worker(), worker()]);

    return () => {
      cancelled = true;
    };
    // Run once on mount against the initial (all) list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const visibleLinks = filteredLinks.slice(0, visibleItems);

  return (
    <PreviewCardProvider>
      <div>
      {/* App bar — category filter on the left, search on the right. Sticks
          under the navbar, and takes the top edge once the navbar scrolls
          away. */}
      <div className="sticky-tabs -mx-5 flex items-center justify-between gap-3 bg-background px-5 py-3 sm:-mx-6 sm:px-6">
        {!searchOpen && (
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
        )}

        <div
          className={`flex items-center gap-2 ${searchOpen ? "flex-1" : ""}`}
        >
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

      {/* List */}
      <div className="mt-6">
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
                  <PreviewCardTrigger
                    payload={{
                      url: link.url,
                      name: link.title,
                      previewImage:
                        previews[link.url] ??
                        `/api/link-preview?url=${encodeURIComponent(link.url)}`,
                    }}
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
                        onClick={() => openEditor(link)}
                        aria-label={
                          isCurated ? "Edit notes" : "Add to collection"
                        }
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <LikeButton linkId={link.id} />
                  </div>
                  </PreviewCardTrigger>
                </FadeIn>
              </div>
            );
          })}

          {visibleLinks.length === 0 && (
            <p className="px-3 py-10 text-center type-caption">
              No links match “{searchTerm}”.
            </p>
          )}
        </div>

        {filteredLinks.length > visibleItems && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setVisibleItems((prev) => prev + ITEMS_PER_PAGE)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              Show {Math.min(ITEMS_PER_PAGE, filteredLinks.length - visibleItems)}{" "}
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