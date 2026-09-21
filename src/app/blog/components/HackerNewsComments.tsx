"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  countComments,
  extractHnItemId,
  HnBlock,
  HnComment,
  HnInlineNode,
  HnThread,
} from "../utils/hnUtils";

const HN_ORANGE = "#ff6600";
const INITIAL_TOP_LEVEL = 8;
const TOP_LEVEL_STEP = 8;

type Status = "idle" | "loading" | "ready" | "error";

interface HackerNewsCommentsProps {
  hnUrl: string;
}

export default function HackerNewsComments({ hnUrl }: HackerNewsCommentsProps) {
  const itemId = useMemo(() => extractHnItemId(hnUrl), [hnUrl]);

  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [thread, setThread] = useState<HnThread | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_TOP_LEVEL);
  // Ids of the comment currently under the cursor plus all of its ancestors.
  // Used to trace a continuous thread line down to the comment being read.
  const [activePath, setActivePath] = useState<number[]>([]);

  const containerRef = useRef<HTMLElement | null>(null);

  // Only fetch once the discussion is close to the viewport, so readers who
  // never scroll past the article never pay for the request.
  useEffect(() => {
    if (!itemId) return;

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [itemId]);

  const loadThread = useCallback(async () => {
    if (!itemId) return;
    setStatus("loading");
    try {
      const response = await fetch(`/api/hn/comments?id=${itemId}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = (await response.json()) as HnThread;
      setThread(data);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load Hacker News comments:", error);
      setStatus("error");
    }
  }, [itemId]);

  useEffect(() => {
    if (shouldLoad && status === "idle") {
      void loadThread();
    }
  }, [shouldLoad, status, loadThread]);

  const hoverPath = useMemo(
    () => ({ activePath, setActivePath }),
    [activePath]
  );

  if (!itemId) return null;

  const comments = thread?.comments ?? [];
  const visibleComments = comments.slice(0, visibleCount);
  const remaining = comments.length - visibleComments.length;
  const commentCount = thread?.commentCount ?? 0;

  return (
    <section
      ref={containerRef}
      id="hn-discussion"
      className="not-prose mt-16 border-t border-border pt-8"
      aria-labelledby="hn-discussion-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10"
            style={{ backgroundColor: HN_ORANGE }}
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="16" height="16" rx="2" fill="white" />
              <path
                d="M8.5 9.5V13H7.5V9.5L4.5 3H5.7L8 8.3L10.3 3H11.5L8.5 9.5Z"
                fill="#ff6600"
              />
            </svg>
          </span>
          <div>
            <h2
              id="hn-discussion-heading"
              className="text-balance text-base font-semibold text-foreground sm:text-lg"
            >
              Discussion on Hacker News
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {status === "ready" ? (
                <span className="tabular-nums">
                  {commentCount} {commentCount === 1 ? "comment" : "comments"}
                  {typeof thread?.points === "number" && (
                    <>
                      {" "}
                      <span aria-hidden="true" className="text-border">
                        ·
                      </span>{" "}
                      {thread.points} points
                    </>
                  )}
                </span>
              ) : (
                "Loading the conversation…"
              )}
            </p>
          </div>
        </div>

        <a
          href={hnUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border py-1.5 pl-3.5 pr-3 text-sm font-medium text-foreground transition-[color,border-color,scale] duration-150 ease-out hover:border-[#ff6600] hover:text-[#ff6600] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Open thread
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="mt-6">
        {(status === "idle" || status === "loading") && <CommentsSkeleton />}

        {status === "error" && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Couldn&apos;t load the discussion right now.</span>
            </div>
            <button
              type="button"
              onClick={() => void loadThread()}
              className="rounded-md text-sm font-medium text-[#ff6600] transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && comments.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>
              No comments yet.{" "}
              <a
                href={hnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff6600] hover:underline"
              >
                Start the conversation on HN.
              </a>
            </span>
          </div>
        )}

        {status === "ready" && comments.length > 0 && (
          <HoverPathContext.Provider value={hoverPath}>
            <div onMouseLeave={() => setActivePath([])}>
              <div className="divide-y divide-border/60">
                {visibleComments.map((comment) => (
                  <HnCommentNode
                    key={comment.id}
                    comment={comment}
                    storyAuthor={thread?.author ?? null}
                    depth={0}
                    ancestors={[]}
                  />
                ))}
              </div>

              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + TOP_LEVEL_STEP)
                  }
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-[color,border-color,scale] duration-150 ease-out hover:border-[#ff6600]/50 hover:text-[#ff6600] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show {remaining} more{" "}
                  {remaining === 1 ? "comment" : "comments"}
                </button>
              )}
            </div>
          </HoverPathContext.Provider>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Thread spine hover tracing
// ---------------------------------------------------------------------------

interface HoverPathValue {
  activePath: number[];
  setActivePath: (ids: number[]) => void;
}

const HoverPathContext = createContext<HoverPathValue>({
  activePath: [],
  setActivePath: () => {},
});

function useHoverPath() {
  return useContext(HoverPathContext);
}

// ---------------------------------------------------------------------------
// Loading placeholder — mirrors the avatar + text-lines shape of real comments
// so the section doesn't visibly jump when the thread arrives.
// ---------------------------------------------------------------------------

const SKELETON_ROWS = [
  { indent: 0, lines: ["w-2/5", "w-full", "w-11/12"] },
  { indent: 0, lines: ["w-1/4", "w-full", "w-3/4"] },
  { indent: 1, lines: ["w-1/3", "w-full", "w-5/6"] },
];

function CommentsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {SKELETON_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex gap-3",
            row.indent > 0 && "border-l border-border pl-3 sm:pl-5"
          )}
        >
          <div className="mt-0.5 h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            {row.lines.map((width, lineIndex) => (
              <div
                key={lineIndex}
                className={cn("h-3 animate-pulse rounded bg-muted", width)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single comment and its replies
// ---------------------------------------------------------------------------

interface HnCommentNodeProps {
  comment: HnComment;
  storyAuthor: string | null;
  depth: number;
  ancestors: number[];
}

function HnCommentNode({
  comment,
  storyAuthor,
  depth,
  ancestors,
}: HnCommentNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { activePath, setActivePath } = useHoverPath();

  const hasChildren = comment.children.length > 0;
  const descendantCount = useMemo(
    () => (hasChildren ? countComments(comment.children) : 0),
    [hasChildren, comment.children]
  );
  const pathToHere = useMemo(
    () => [...ancestors, comment.id],
    [ancestors, comment.id]
  );

  const isOp = storyAuthor != null && comment.author === storyAuthor;
  const isOnActivePath = activePath.includes(comment.id);
  const initial = comment.author.charAt(0).toUpperCase();
  const bodyId = `hn-comment-body-${comment.id}`;

  // Indentation compounds with every level, so soften it past a few levels to
  // keep deep threads readable on narrow screens while keeping the rail.
  const indentPadding =
    depth === 0 ? "" : depth <= 4 ? "pl-2.5 sm:pl-4" : "pl-1";

  return (
    <div
      onMouseEnter={() => setActivePath(pathToHere)}
      className={cn(
        depth > 0 &&
          "border-l transition-colors duration-200 ease-out motion-reduce:transition-none",
        indentPadding,
        depth > 0 && (isOnActivePath ? "border-[#ff6600]/50" : "border-border")
      )}
    >
      <div className="py-4">
        <div className="flex items-start gap-2.5">
          <Avatar
            author={comment.author}
            initial={initial}
            interactive={hasChildren}
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            bodyId={bodyId}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <a
                href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                  comment.author
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-foreground transition-colors duration-150 ease-out hover:text-[#ff6600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {comment.author}
              </a>

              {isOp && (
                <span className="rounded-full border border-[#ff6600]/40 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#ff6600]">
                  author
                </span>
              )}

              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <time
                dateTime={comment.createdAt}
                title={new Date(comment.createdAt).toLocaleString()}
                className="tabular-nums"
              >
                {timeAgo(comment.createdAt)}
              </time>

              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-expanded={!collapsed}
                  aria-controls={bodyId}
                  aria-label={
                    collapsed
                      ? `Expand ${descendantCount} ${
                          descendantCount === 1 ? "reply" : "replies"
                        } from ${comment.author}`
                      : `Collapse replies from ${comment.author}`
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
                      collapsed && "-rotate-90"
                    )}
                  />
                  <span className="tabular-nums">
                    {collapsed
                      ? `${descendantCount} ${
                          descendantCount === 1 ? "reply" : "replies"
                        }`
                      : "Hide"}
                  </span>
                </button>
              )}
            </div>

            <div id={bodyId}>
              {collapsed ? (
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground/80">
                  {previewText(comment.blocks)}
                </p>
              ) : (
                <>
                  <CommentBody blocks={comment.blocks} />

                  <a
                    href={comment.replyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Reply to ${comment.author} on Hacker News`}
                    className="mt-1.5 inline-block rounded text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-[#ff6600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Reply on HN
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {!collapsed && hasChildren && (
          <div className="mt-0.5" role="group" aria-label="Replies">
            {comment.children.map((child) => (
              <HnCommentNode
                key={child.id}
                comment={child}
                storyAuthor={storyAuthor}
                depth={depth + 1}
                ancestors={pathToHere}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AvatarProps {
  author: string;
  initial: string;
  interactive: boolean;
  collapsed: boolean;
  onToggle: () => void;
  bodyId: string;
}

function Avatar({
  author,
  initial,
  interactive,
  collapsed,
  onToggle,
  bodyId,
}: AvatarProps) {
  const circle = (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10",
        avatarClass(author)
      )}
    >
      {initial}
    </span>
  );

  if (!interactive) {
    return <span className="mt-0.5 flex-shrink-0">{circle}</span>;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={bodyId}
      aria-label={
        collapsed ? `Expand replies from ${author}` : `Collapse replies from ${author}`
      }
      className="relative mt-0.5 flex-shrink-0 rounded-full transition-transform duration-150 ease-out after:absolute after:-inset-1 after:content-[''] hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      {circle}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Comment content
// ---------------------------------------------------------------------------

function CommentBody({ blocks }: { blocks: HnBlock[] }) {
  return (
    <div className="mt-1.5 space-y-3 text-[15px] leading-7 text-foreground/90">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 text-[13px] leading-relaxed"
            >
              <code className="font-mono text-foreground">{block.value}</code>
            </pre>
          );
        }

        const quoted = isQuoteBlock(block);
        const nodes = quoted ? stripQuoteMarker(block.nodes) : block.nodes;

        return (
          <p
            key={index}
            className={cn(
              "whitespace-pre-wrap break-words text-pretty",
              quoted &&
                "border-l-2 border-border pl-3 italic text-muted-foreground"
            )}
          >
            {nodes.map((node, nodeIndex) => renderInlineNode(node, nodeIndex))}
          </p>
        );
      })}
    </div>
  );
}

/** HN has no quote markup — commenters prefix quotes with a bare `>`. */
function isQuoteBlock(block: HnBlock): boolean {
  return (
    block.type === "paragraph" &&
    block.nodes[0]?.type === "text" &&
    block.nodes[0].value.trimStart().startsWith(">")
  );
}

function stripQuoteMarker(nodes: HnInlineNode[]): HnInlineNode[] {
  const [first, ...rest] = nodes;
  if (!first || first.type !== "text") return nodes;
  const value = first.value.replace(/^\s*>\s?/, "");
  return [{ ...first, value }, ...rest].filter(
    (node) => node.type !== "text" || node.value.length > 0
  );
}

function previewText(blocks: HnBlock[]): string {
  const first = blocks[0];
  if (!first) return "";
  const text =
    first.type === "code"
      ? first.value
      : first.nodes.map((node) => node.value).join("");
  return text.replace(/^\s*>\s?/, "").trim();
}

function renderInlineNode(node: HnInlineNode, key: number) {
  if (node.type === "link") {
    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-words text-[#ff6600] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {node.value}
      </a>
    );
  }

  if (node.type === "code") {
    return (
      <code
        key={key}
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground"
      >
        {node.value}
      </code>
    );
  }

  return <React.Fragment key={key}>{node.value}</React.Fragment>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Deterministic, low-chroma tints so the author marker is recognisable without
// scattering saturated color through a mostly neutral page.
const AVATAR_CLASSES = [
  "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
];

function avatarClass(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return AVATAR_CLASSES[hash % AVATAR_CLASSES.length];
}

function timeAgo(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";

  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}