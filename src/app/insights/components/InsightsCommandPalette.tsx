"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  BookOpen,
  BookOpenText,
  Books,
  BracketsCurly,
  Check,
  Clock,
  ClockCounterClockwise,
  Copy,
  FilmStrip,
  FunnelSimple,
  Heart,
  House,
  List as ListIcon,
  Moon,
  Shuffle,
  Sparkle,
  SquaresFour,
  Stack,
  Sun,
  Tag,
  Trash,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/context/ThemeContext";
import { useFeedback } from "@/hooks/useFeedback";
import type { InsightsClientLink } from "../utils/links-data";
import { SORT_LABELS, type SortMode } from "../utils/sort";

type Link = InsightsClientLink & { category: string };

export interface PaletteCategory {
  value: string;
  label: string;
  count: number;
}

export interface PaletteTopic {
  topic: string;
  count: number;
}

interface InsightsCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The whole collection, de-duplicated, newest first. */
  links: Link[];
  categories: PaletteCategory[];
  activeCategory: string;
  onCategory: (value: string) => void;
  topics: PaletteTopic[];
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
  searchTerm: string;
  onClearSearch: () => void;
  onClearTopics: () => void;
  sort: SortMode;
  onSort: (sort: SortMode) => void;
  view: "list" | "grid";
  onView: (view: "list" | "grid") => void;
  /** Narrow the list itself to this text, then close. */
  onSearch: (query: string) => void;
  /** Open a link: articles read in place, the rest open at the source. */
  onOpenLink: (link: Link) => void;
  onCopyPageLink: () => void;
  isAdmin: boolean;
  onCleanup: () => void;
  shortDomain: (url: string) => string;
}

/** A stable, searchable `value` for a command row. cmdk filters on it. */
const val = (prefix: string, ...parts: (string | undefined)[]) =>
  [prefix, ...parts.filter(Boolean)].join(" ");

/** The one key style, shared by every hint in the palette. */
const KBD =
  "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1.5 text-[10px] font-medium text-faint-foreground";

/**
 * The command palette.
 *
 * Not an index of everything the page can do. It shows the commands that make
 * sense for where the visitor is standing: the moves that would actually change
 * the current state, and the filters that are currently on (with the command to
 * turn each one off). A visitor with nothing filtered and nothing typed sees the
 * collection and a handful of ways to move through it — not a wall of verbs.
 *
 * Typing opens the rest: the whole collection, every category, every topic, and
 * the Ask/filter verbs that only exist once there is a query to act on.
 *
 * Behaviour comes from cmdk (arrow keys, Enter, fuzzy filtering); the look comes
 * from the command primitive.
 */
export function InsightsCommandPalette({
  open,
  onOpenChange,
  links,
  categories,
  activeCategory,
  onCategory,
  topics,
  selectedTopics,
  onToggleTopic,
  searchTerm,
  onClearSearch,
  onClearTopics,
  sort,
  onSort,
  view,
  onView,
  onSearch,
  onOpenLink,
  onCopyPageLink,
  isAdmin,
  onCleanup,
  shortDomain,
}: InsightsCommandPaletteProps) {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const feedback = useFeedback();
  const [query, setQuery] = useState("");

  // Reset the query every time the palette opens, so it never reopens on the
  // last thing you searched for.
  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  const run = (action: () => void) => {
    feedback.select();
    action();
    handleOpenChange(false);
  };

  /* ------------------------------------------------------------- context */

  const hasQuery = query.trim().length > 0;
  const search = searchTerm.trim();
  const hasSearch = search !== "";
  const hasTopics = selectedTopics.length > 0;
  const hasCategory = activeCategory !== "all";
  const filterCount = Number(hasSearch) + Number(hasTopics) + Number(hasCategory);

  // Empty, show a few recent links so the palette is useful before you type;
  // once there is a query, cmdk filters the whole collection.
  const linkRows = useMemo(
    () => (hasQuery ? links : links.slice(0, 6)),
    [hasQuery, links]
  );

  // Only the moves that would change something: the other view, the other
  // sorts. Offering the state you are already in is a command that does
  // nothing.
  const otherView = view === "list" ? "grid" : "list";
  const allSorts: { value: SortMode; label: string; icon: PhosphorIcon }[] = [
    { value: "newest", label: SORT_LABELS.newest, icon: Clock },
    { value: "liked", label: SORT_LABELS.liked, icon: Heart },
    { value: "shuffle", label: SORT_LABELS.shuffle, icon: Shuffle },
  ];
  // Oldest is a clean-up tool, so it only exists for admins.
  if (isAdmin) {
    allSorts.push({
      value: "oldest",
      label: SORT_LABELS.oldest,
      icon: ClockCounterClockwise,
    });
  }
  const otherSorts = allSorts.filter((option) => option.value !== sort);

  const goTo: { label: string; path: string; icon: PhosphorIcon }[] = [
    { label: "Home", path: "/", icon: House },
    { label: "Insights", path: "/insights", icon: BookOpenText },
    { label: "Curio", path: "/curio", icon: Sparkle },
    { label: "Blog", path: "/blog", icon: BookOpenText },
    { label: "Books", path: "/books", icon: Books },
    { label: "Gallery", path: "/gallery", icon: FilmStrip },
    { label: "Projects", path: "/projects", icon: Stack },
    { label: "Docs", path: "/docs", icon: BracketsCurly },
  ];

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Search the collection"
    >
      <CommandInput
        onValueChange={setQuery}
        placeholder="Search links, or jump to…"
        aria-label="Search links, or jump to a page or action"
      >
        <kbd className={`${KBD} hidden sm:inline-flex`}>
          esc
        </kbd>
      </CommandInput>

      <CommandList>
        <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>

        {/* The filters that are on, each with the command to turn it off. This
            is the most relevant group when it exists, so it goes first. */}
        {filterCount > 0 && (
          <CommandGroup heading="Filters">
            {hasSearch && (
              <CommandItem
                value={val("filter", "clear", "search", search)}
                onSelect={() => run(onClearSearch)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  Clear search “{search}”
                </span>
              </CommandItem>
            )}
            {hasTopics && (
              <CommandItem
                value={val("filter", "clear", "topics", ...selectedTopics)}
                onSelect={() => run(onClearTopics)}
              >
                <X aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  Clear {selectedTopics.length} topic
                  {selectedTopics.length === 1 ? "" : "s"}
                </span>
              </CommandItem>
            )}
            {hasCategory && (
              <CommandItem
                value={val("filter", "clear", "category", "all")}
                onSelect={() => run(() => onCategory("all"))}
              >
                <FunnelSimple aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  Show all categories
                </span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {linkRows.length > 0 && (
          <CommandGroup heading={hasQuery ? "Links" : "Recent links"}>
            {linkRows.map((link) => {
              const domain = shortDomain(link.url);
              const readInPlace = link.category === "article";
              return (
                <CommandItem
                  key={link.id}
                  value={val(
                    `link:${link.urlKey}`,
                    link.title,
                    domain,
                    (link.topics ?? []).join(" ")
                  )}
                  onSelect={() => run(() => onOpenLink(link))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                    className="h-4 w-4 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {link.title}
                  </span>
                  {domain && (
                    <CommandShortcut className="hidden sm:block">
                      {domain}
                    </CommandShortcut>
                  )}
                  <span className="shrink-0 text-faint-foreground">
                    {readInPlace ? (
                      <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowSquareOut
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    )}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Verbs that only exist once there is a query to act on. */}
        {hasQuery && (
          <CommandGroup heading="Ask">
            <CommandItem
              value={val("ask", query)}
              onSelect={() =>
                run(() =>
                  router.push(`/curio?q=${encodeURIComponent(query.trim())}`)
                )
              }
            >
              <Sparkle aria-hidden="true" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate text-foreground">
                Ask Curio: “{query.trim()}”
              </span>
            </CommandItem>
            <CommandItem
              value={val("filter", query)}
              onSelect={() => run(() => onSearch(query.trim()))}
            >
              <ListIcon aria-hidden="true" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate text-foreground">
                Filter this list to “{query.trim()}”
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {hasQuery && (
          <CommandGroup heading="Categories">
            {categories.map((category) => {
              const active = activeCategory === category.value;
              return (
                <CommandItem
                  key={category.value}
                  value={val("category", category.label, category.value)}
                  onSelect={() => run(() => onCategory(category.value))}
                >
                  <Tag aria-hidden="true" className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {category.label}
                  </span>
                  <CommandShortcut>{category.count}</CommandShortcut>
                  {active && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {hasQuery && topics.length > 0 && (
          <CommandGroup heading="Topics">
            {topics.map(({ topic, count }) => {
              const active = selectedTopics.includes(topic);
              return (
                <CommandItem
                  key={topic}
                  value={val("topic", topic)}
                  onSelect={() => {
                    feedback.select();
                    onToggleTopic(topic);
                  }}
                >
                  <Tag aria-hidden="true" className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {topic}
                  </span>
                  <CommandShortcut>{count}</CommandShortcut>
                  {active && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* The moves that change the arrangement. The view toggle is always
            worth a row; the sorts wait for a query, because the toolbar already
            owns them and the empty palette should stay short. */}
        <CommandGroup heading="Arrange">
          <CommandItem
            value={val("view", otherView, "list grid")}
            onSelect={() => run(() => onView(otherView))}
          >
            {otherView === "grid" ? (
              <SquaresFour aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ListIcon aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="min-w-0 flex-1 truncate text-foreground">
              Switch to {otherView} view
            </span>
            <CommandShortcut>
              <kbd className={KBD}>v</kbd>
            </CommandShortcut>
          </CommandItem>
          {hasQuery &&
            otherSorts.map((option) => (
              <CommandItem
                key={option.value}
                value={val("sort", option.label)}
                onSelect={() => run(() => onSort(option.value))}
              >
                <option.icon aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  Sort by {option.label.toLowerCase()}
                </span>
                {sort === option.value && (
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                )}
              </CommandItem>
            ))}
        </CommandGroup>

        {/* The two things a visitor reaches for without typing. The rest — RSS,
            cleanup — are searches, not starting points. */}
        <CommandGroup heading="Actions">
          <CommandItem
            value={val("action", "theme", "dark", "light", "mode", "appearance")}
            onSelect={() => run(toggleDarkMode)}
          >
            {isDarkMode ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="min-w-0 flex-1 truncate text-foreground">
              {isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            </span>
            <CommandShortcut>
              <kbd className={KBD}>t</kbd>
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            value={val("action", "copy", "page", "link", "url")}
            onSelect={() => run(onCopyPageLink)}
          >
            <Copy aria-hidden="true" className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              Copy link to this page
            </span>
          </CommandItem>
          {hasQuery && (
            <CommandItem
              value={val("action", "rss", "feed", "subscribe", "xml")}
              onSelect={() =>
                run(() => window.open("/insights/rss.xml", "_blank"))
              }
            >
              <BracketsCurly aria-hidden="true" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate text-foreground">
                Open the RSS feed
              </span>
            </CommandItem>
          )}
          {hasQuery && isAdmin && (
            <CommandItem
              value={val("action", "clean", "cleanup", "delete", "hide")}
              onSelect={() => run(onCleanup)}
            >
              <Trash aria-hidden="true" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate text-foreground">
                Clean up links
              </span>
            </CommandItem>
          )}
        </CommandGroup>

        {hasQuery && (
          <CommandGroup heading="Go to">
            {goTo.map((item) => (
              <CommandItem
                key={item.path}
                value={val("go", item.label)}
                onSelect={() => run(() => router.push(item.path))}
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {item.label}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-t border-border px-4 text-[12px] text-faint-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>
              ↑
            </kbd>
            <kbd className={KBD}>
              ↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KBD}>
              ↵
            </kbd>
            open
          </span>
        </span>
        <span className="tabular-nums">
          {links.length} link{links.length === 1 ? "" : "s"}
        </span>
      </div>
    </CommandDialog>
  );
}
