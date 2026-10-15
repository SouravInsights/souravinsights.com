"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { ArticleBody } from "./ArticleBody";
import { ReaderAsk } from "./ReaderAsk";
import { articleQuery } from "./article-query";

/**
 * The reader as a side panel of /insights — the collection stays on the
 * left, the article slides in from the right, the app's shell never moves.
 *
 * Desktop: a visible grip on the left edge drags the panel wider (double-
 * click toggles default ↔ wide), the window button next to Close takes it
 * fullscreen. Width sticks across sessions. Articles come cache-first via
 * TanStack Query — a reopened or hover-warmed article shows no loader.
 */

const prettyWidthFallback = "min(42rem, 94vw)";
const MIN_WIDTH = 420;
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
  onClose,
}: {
  urlKey: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  // Cache-first: a reopened or hover-warmed article never shows a loader.
  const { data: article, isError: failed } = useQuery(articleQuery(urlKey));
  const [width, setWidth] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(WIDTH_KEY));
    if (stored >= MIN_WIDTH) setWidth(stored);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  const host = article ? hostOf(article.url) : "";
  const readingMinutes = article?.wordCount
    ? Math.max(1, Math.round(article.wordCount / 200))
    : null;

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
        style={{
          width: fullscreen ? "97vw" : width ? `${width}px` : prettyWidthFallback,
          maxWidth: "97vw",
        }}
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

        <aside className="h-full w-full overflow-y-auto border-l border-border bg-background shadow-2xl shadow-black/20">
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

        {/* One toolbar, both controls, no duplicates (it floats over long
            reads so closing is always one glance away). */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-5 pb-2.5 pt-3 backdrop-blur sm:px-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className={`mx-auto px-5 pb-28 pt-7 sm:px-7 ${fullscreen ? "max-w-3xl" : "max-w-2xl"}`}>

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

              <div
                className="prose prose-green mt-8 max-w-none dark:prose-invert
                  prose-headings:font-semibold
                  prose-a:text-green-700 dark:prose-a:text-green-500
                  prose-p:text-gray-700 dark:prose-p:text-muted-foreground
                  prose-blockquote:border-green-500 dark:prose-blockquote:border-green-500
                  prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-muted/50"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                  components={{
                    a: (props) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    img: ({ src, alt }) => {
                      if (!src) return null;
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

              <ReaderAsk linkId={article.id} title={article.title} />
            </ArticleBody>
          )}
        </div>
        </aside>
      </motion.div>
    </>
  );
}
