"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  ArrowsInSimple,
  ArrowsOutSimple,
  ArrowSquareOut,
  Check,
  Copy,
  DotsThree,
  LinkSimple,
  SidebarSimple,
  X,
} from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArticleBody } from "./ArticleBody";
import { HighlightRail, type HighlightRailItem } from "@/components/highlight/highlight-rail";
import { CoReader, type Tab } from "./CoReader";
import { ShareQuoteDialog } from "@/components/quote/dialog";
import {
  APPEARANCE_DEFAULT,
  ReaderAppearance,
  appearanceStyle,
  type Appearance,
} from "./ReaderAppearance";
import { articleQuery } from "./article-query";

/**
 * The reader as a side panel of /insights — the collection stays on the
 * left, the article slides in from the right, the app's shell never moves.
 *
 * Desktop: a visible grip on the left edge drags the panel wider (double-
 * click toggles default ↔ wide), the window button next to Close takes it
 * fullscreen. Width sticks across sessions. Articles come cache-first via
 * TanStack Query — a reopened or hover-warmed article shows no loader.
 *
 * The Co-Reader is a second column inside the panel: the article on the left,
 * the companion rail on the right. It is open by default on a desktop, and on a
 * phone it covers the article instead of squeezing it — there is no width for
 * two columns there.
 */

const prettyWidthFallback = "min(42rem, 94vw)";
const MIN_WIDTH = 420;
/** Panel width that keeps the article readable once the rail is docked. */
const WIDTH_WITH_RAIL = 1000;
const WIDTH_KEY = "insights:reader-width";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const isVideo = (src: string) => /\.(mp4|webm|mov)(\?|#|$)/i.test(src);

/** One image in the article: absolute URL, lazy, capped, captioned, and
 *  honest about breakage (a broken image hides itself — no torn icon). */
function ArticleImage({ src, alt }: { src: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;

  if (isVideo(src)) {
    // Motion demos are the content in design articles: muted looped autoplay
    // is the native reading experience for them.
    return (
      <span className="my-6 block">
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          className="w-full rounded-xl border border-border/60"
        />
      </span>
    );
  }

  return (
    <span className="my-6 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        onError={() => setBroken(true)}
        className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg border border-border/60 object-contain"
      />
      {alt?.trim() ? (
        <span className="mt-2 block text-center type-caption text-faint-foreground">
          {alt}
        </span>
      ) : null}
    </span>
  );
}

export function ReaderView({
  urlKey,
  isAdmin,
  initialFullscreen = false,
  onClose,
}: {
  urlKey: string;
  isAdmin: boolean;
  /** open straight into focus mode — a double-click on the row asks for it */
  initialFullscreen?: boolean;
  onClose: () => void;
}) {
  // Cache-first: a reopened or hover-warmed article never shows a loader.
  const { data: article, isError: failed } = useQuery(articleQuery(urlKey));
  const [width, setWidth] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(initialFullscreen);
  const [resizing, setResizing] = useState(false);
  const [coReader, setCoReader] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );
  const [share, setShare] = useState<{ quote: string; context: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [coReaderTab, setCoReaderTab] = useState<Tab>("reader");
  const [ticks, setTicks] = useState<HighlightRailItem[]>([]);
  const [appearance, setAppearance] = useState<Appearance>(APPEARANCE_DEFAULT);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [chromeHidden, setChromeHidden] = useState(false);
  const lastScrollTop = useRef(0);

  /**
   * The toolbar gets out of the way on the way down and returns on the way up
   * or at the top. Reading is the point; the chrome is not.
   */
  const onArticleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop;
    const delta = top - lastScrollTop.current;
    lastScrollTop.current = top;
    if (top < 48) setChromeHidden(false);
    else if (delta > 3) setChromeHidden(true);
    else if (delta < -3) setChromeHidden(false);
  }, []);

  const jumpToMark = useCallback((id: number) => {
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-hl="${id}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  // The reading preferences stick across articles and sessions — they are set
  // once, not per page.
  useEffect(() => {
    const stored = window.localStorage.getItem("insights:reader-appearance");
    if (!stored) return;
    try {
      setAppearance({ ...APPEARANCE_DEFAULT, ...JSON.parse(stored) });
    } catch {
      // A bad value falls back to the defaults rather than breaking the reader.
    }
  }, []);

  const updateAppearance = useCallback((next: Appearance) => {
    setAppearance(next);
    window.localStorage.setItem(
      "insights:reader-appearance",
      JSON.stringify(next)
    );
  }, []);

  // Fullscreen gets one step wider, because the canvas is bigger.
  const measure = fullscreen
    ? appearance.width === "wide"
      ? "max-w-3xl"
      : "max-w-2xl"
    : appearance.width === "wide"
      ? "max-w-2xl"
      : "max-w-xl";
  // Read once on mount, not through `useMediaQuery`: this panel is client-only,
  // so the real answer is available before the first paint and the rail never
  // flashes as an overlay on a desktop.
  const [desktop, setDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(WIDTH_KEY));
    if (stored >= MIN_WIDTH) setWidth(stored);
  }, []);

  // The reader is a focused overlay, not a second page. The list behind it keeps
  // its own scrollbar otherwise, and two scrollbars at the same edge read as a
  // bug. Locks the page for as long as the reader is open.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A dialog on top owns Escape; so does an open rail on a phone.
      if (share !== null) return;
      if (coReader && !desktop) {
        setCoReader(false);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, share, coReader, desktop]);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = width ?? Math.min(window.innerWidth * 0.94, 42 * 16);
      setResizing(true);

      const move = (e: globalThis.PointerEvent) => {
        const next = startWidth + (startX - e.clientX);
        setWidth(
          Math.round(Math.min(window.innerWidth * 0.97, Math.max(MIN_WIDTH, next)))
        );
      };
      const up = (e: globalThis.PointerEvent) => {
        target.releasePointerCapture(e.pointerId);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        setResizing(false);
        setWidth((current) => {
          if (current) window.localStorage.setItem(WIDTH_KEY, String(current));
          return current;
        });
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
    },
    [width]
  );

  /** Double-click the grip: default width ↔ wide. */
  const toggleWide = useCallback(() => {
    setWidth((current) => {
      const wide = Math.round(window.innerWidth * 0.8);
      const base = Math.min(42 * 16, window.innerWidth * 0.94);
      const next = current && current > window.innerWidth * 0.7 ? Math.round(base) : wide;
      window.localStorage.setItem(WIDTH_KEY, String(next));
      return next;
    });
  }, []);

  /** Docking the rail needs room; widen the panel once so the article keeps
   *  a readable measure instead of being squeezed into a column. */
  const toggleCoReader = useCallback(() => {
    const next = !coReader;
    setCoReader(next);
    if (next && desktop) {
      setWidth((current) => {
        const base = current ?? Math.min(window.innerWidth * 0.94, 42 * 16);
        if (base >= WIDTH_WITH_RAIL) return current;
        const widened = Math.round(
          Math.min(window.innerWidth * 0.97, WIDTH_WITH_RAIL)
        );
        window.localStorage.setItem(WIDTH_KEY, String(widened));
        return widened;
      });
    }
  }, [coReader, desktop]);

  const copyLink = useCallback(() => {
    if (!article) return;
    void navigator.clipboard.writeText(article.url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => undefined
    );
  }, [article]);

  const copyMarkdown = useCallback(() => {
    if (!article) return;
    void navigator.clipboard.writeText(article.markdown).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => undefined
    );
  }, [article]);

  const host = article ? hostOf(article.url) : "";
  const readingMinutes = article?.wordCount
    ? Math.max(1, Math.round(article.wordCount / 200))
    : null;

  // The panel width: fullscreen wins, then the stored drag width, then a rail
  // minimum when the Co-Reader is docked on a desktop.
  let styleWidth: string;
  if (fullscreen) styleWidth = "97vw";
  else if (width) styleWidth = `${width}px`;
  else styleWidth = prettyWidthFallback;
  if (coReader && desktop && !fullscreen) {
    const current = width ?? Math.min(window.innerWidth * 0.94, 42 * 16);
    styleWidth = `${Math.round(
      Math.min(window.innerWidth * 0.97, Math.max(current, WIDTH_WITH_RAIL))
    )}px`;
  }

  return (
    <>
      {/* Outside the panel: click to close, like any native detail pane. */}
      <motion.div
        className="fixed inset-0 z-40 hidden bg-black/20 sm:block"
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={article?.title ?? "Article"}
        className="fixed inset-y-0 right-0 z-50"
        style={{ width: styleWidth, maxWidth: "97vw" }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 42 }}
      >
        {/* The grip lives OUTSIDE the scroller, pinned to the panel's edge:
            it never moves as the article scrolls. Drag to size exactly;
            double-click toggles default ↔ wide. */}
        {!fullscreen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize the reader"
            title="Drag to resize · double-click to toggle width"
            onPointerDown={startResize}
            onDoubleClick={toggleWide}
            className="group/grip absolute inset-y-0 left-0 z-20 hidden w-4 cursor-col-resize items-center justify-center sm:flex"
          >
            <span
              className={`h-12 w-[5px] rounded-full transition-all duration-150 ${
                resizing
                  ? "bg-green-600 opacity-100"
                  : "bg-foreground/20 opacity-70 group-hover/grip:h-14 group-hover/grip:bg-foreground/40 group-hover/grip:opacity-100"
              }`}
            />
          </div>
        )}

        <aside className="relative flex h-full w-full overflow-hidden border-l border-border bg-background shadow-2xl shadow-black/20">
          {/* Code tokens, hand-tuned to the panel's dark code frame. */}
          <style>{`
            .hljs-comment,.hljs-quote{color:#8b949e;font-style:italic}
            .hljs-keyword,.hljs-selector-tag,.hljs-doctag,.hljs-template-tag{color:#ff7b72}
            .hljs-string,.hljs-regexp,.hljs-meta .hljs-string{color:#a5d6ff}
            .hljs-number,.hljs-literal{color:#79c0ff}
            .hljs-title,.hljs-section,.hljs-name,.hljs-attr,.hljs-attribute,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-id,.hljs-selector-class{color:#d2a8ff}
            .hljs-built_in,.hljs-builtin-name{color:#ffa657}
            .hljs-symbol,.hljs-bullet,.hljs-link{color:#a5d6ff}
            .hljs-operator{color:#ff7b72}
            .hljs-emphasis{font-style:italic}
            .hljs-strong{font-weight:700}
            .hljs-addition{color:#aff5b4;background-color:#033a16}
            .hljs-deletion{color:#ffdcd7;background-color:#67060c}
          `}</style>

          <div className="relative flex min-w-0 flex-1 flex-col">
            {/* One toolbar, every control. It floats over the article and steps
                aside while you read, so nothing sits between you and the text. */}
            <div
              className={`absolute inset-x-0 top-0 z-20 flex items-center gap-1 border-b border-border/60 bg-background/90 px-2.5 py-2 backdrop-blur transition-[opacity,transform] duration-200 ease-out sm:px-4 ${
                chromeHidden
                  ? "pointer-events-none -translate-y-full opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close reader"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              {article && (
                <p className="mx-1 hidden min-w-0 flex-1 truncate type-caption text-faint-foreground sm:block">
                  {article.title}
                </p>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                {article && (
                  <>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open the original page"
                      title="Open original"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      <ArrowSquareOut className="h-4 w-4" />
                    </a>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="More actions"
                          title="More"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                          ) : (
                            <DotsThree weight="bold" className="h-4 w-4" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-52 p-1">
                        <button
                          type="button"
                          onClick={copyLink}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left type-caption text-foreground transition-colors hover:bg-foreground/5"
                        >
                          <LinkSimple className="h-4 w-4 text-muted-foreground" />
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={copyMarkdown}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left type-caption text-foreground transition-colors hover:bg-foreground/5"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          Copy markdown
                        </button>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
                <ReaderAppearance value={appearance} onChange={updateAppearance} />
                <button
                  type="button"
                  onClick={toggleCoReader}
                  aria-label={coReader ? "Hide Co-Reader" : "Show Co-Reader"}
                  aria-pressed={coReader}
                  title="Co-Reader"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-foreground/5 ${
                    coReader
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SidebarSimple className="h-4 w-4 -scale-x-100" />
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreen((f) => !f)}
                  aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {fullscreen ? (
                    <ArrowsInSimple className="h-4 w-4" />
                  ) : (
                    <ArrowsOutSimple className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollerRef}
                onScroll={onArticleScroll}
                className="h-full overflow-y-auto overscroll-contain"
              >
              <div
                className={`mx-auto pb-24 pl-5 pt-[4.75rem] sm:pl-7 ${
                  ticks.length > 0 ? "pr-10 sm:pr-12" : "pr-5 sm:pr-7"
                } ${measure}`}
              >
                {failed && (
                  <p className="mt-16 text-center type-body text-muted-foreground">
                    Couldn’t open this article.{" "}
                    <button
                      type="button"
                      onClick={onClose}
                      className="font-medium text-green-700 underline-offset-4 hover:underline dark:text-green-500"
                    >
                      Back to the collection
                    </button>
                  </p>
                )}

                {!article && !failed && (
                  <div className="mt-12 space-y-4">
                    {[64, 40, 90].map((w, i) => (
                      <div
                        key={i}
                        className="h-4 animate-pulse rounded bg-foreground/10"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                )}

                {article && (
                  <ArticleBody
                    urlKey={article.urlKey}
                    isAdmin={isAdmin}
                    initialHighlights={article.marks}
                    onShareQuote={setShare}
                    onOpenNotebook={() => {
                      setCoReaderTab("notebook");
                      setCoReader(true);
                    }}
                    onTicks={setTicks}
                  >
                    <header className="mt-6 border-b border-border/60 pb-7">
                      <h1 className="text-[1.375rem] font-medium leading-[1.3] tracking-[-0.015em] text-foreground">
                        {article.title}
                      </h1>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 type-caption font-medium text-green-700 underline-offset-4 hover:underline dark:text-green-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
                          alt=""
                          width={14}
                          height={14}
                          className="h-3.5 w-3.5"
                        />
                        {host}
                      </a>
                      <p className="mt-2 type-caption text-faint-foreground">
                        {readingMinutes ? `${readingMinutes} min read — ` : ""}saved{" "}
                        {new Date(article.addedAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </header>

                    {/* Left-aligned on purpose. A justified paragraph forces every
                        line to one right edge, and the browser's greedy line-breaker
                        cannot fill it without rivers — the even edge reads as a cut.
                        The ragged right is the honest one. */}
                    <div
                      className="prose prose-green mt-8 max-w-none dark:prose-invert
                        prose-headings:font-semibold
                        prose-a:text-green-700 dark:prose-a:text-green-500
                        prose-p:text-gray-700 dark:prose-p:text-muted-foreground
                        prose-p:my-[0.75em] prose-p:[font-variant-numeric:oldstyle-nums]
                        prose-h2:mt-[2em] prose-h2:mb-[0.5em] prose-h2:[font-variant-numeric:lining-nums]
                        prose-h3:mt-[1.75em] prose-h3:mb-[0.5em] prose-h3:[font-variant-numeric:lining-nums]
                        prose-blockquote:border-green-500 dark:prose-blockquote:border-green-500
                        prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-muted/50"
                      style={appearanceStyle(appearance)}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                        components={{
                          a: (props) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                          img: ({ src, alt }) => {
                            if (typeof src !== "string") return null;
                            let resolved: string;
                            try {
                              resolved = new URL(src, article.url).toString();
                            } catch {
                              return null;
                            }
                            return <ArticleImage src={resolved} alt={alt} />;
                          },
                          table: (props) => (
                            <div className="my-6 overflow-x-auto rounded-lg border border-border/60">
                              <table className="!my-0 min-w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:bg-foreground/[0.04] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
                                {props.children}
                              </table>
                            </div>
                          ),
                          pre: (props) => (
                            <pre className="!my-6 overflow-x-auto rounded-xl border border-border/50 !bg-[#0d1117] p-4 text-[13px] leading-6">
                              {props.children}
                            </pre>
                          ),
                        }}
                      >
                        {article.markdown}
                      </ReactMarkdown>
                    </div>
                  </ArticleBody>
                )}
              </div>
              </div>
              {/* The rail belongs to the panel, not the column, so it sits in the
                  margin. Hidden while the Co-Reader is docked — there is no
                  margin left to sit in. */}
              {!coReader && (
                <div className="pointer-events-none absolute inset-0 z-[4]">
                  <HighlightRail
                    ticks={ticks}
                    onJump={jumpToMark}
                    onOpenNotebook={() => {
                      setCoReaderTab("notebook");
                      setCoReader(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* The rail. A column on a desktop; on a phone it slides over the
              article, because two columns do not fit in a phone. */}
          {article && coReader && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-30 lg:relative lg:inset-auto lg:z-auto lg:w-[360px] lg:shrink-0 lg:border-l lg:border-border"
            >
              <CoReader
                linkId={article.id}
                urlKey={article.urlKey}
                title={article.title}
                summary={article.summary}
                marks={article.marks}
                tab={coReaderTab}
                onTabChange={setCoReaderTab}
                onClose={() => setCoReader(false)}
              />
            </motion.div>
          )}
        </aside>
      </motion.div>

      {article && (
        <ShareQuoteDialog
          open={share !== null}
          onOpenChange={(open) => {
            if (!open) setShare(null);
          }}
          quote={share?.quote ?? ""}
          context={share?.context ?? ""}
          title={article.title}
          publication={host}
        />
      )}
    </>
  );
}
