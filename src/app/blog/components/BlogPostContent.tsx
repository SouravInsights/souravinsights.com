"use client";

import React, { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, Menu } from "lucide-react";
import Link from "next/link";
import { PostData } from "../utils/blogUtils";
import ThreeDLikeButton from "./ThreeDLikeButton";
import ViewCounter from "./ViewCounter";
import CollapsibleTOC from "./CollapsibleTOC";
import DraftPostIndicator from "./DraftPostIndicator";
import HackerNewsButton from "./HackerNewsButton";
import HackerNewsComments from "./HackerNewsComments";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BlogPostContentProps {
  post: PostData;
  content: React.ReactNode;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function BlogPostContent({
  post,
  content,
}: BlogPostContentProps) {
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>("");
  // Compact TOC popover for the mobile toolbar.
  const [tocOpen, setTocOpen] = useState<boolean>(false);
  const [isTOCCollapsed, setIsTOCCollapsed] = useState<boolean>(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Extract headings for table of contents
  useEffect(() => {
    const extractHeadings = () => {
      // Only select headings within the article content area
      const contentContainer = document.getElementById("mdx-content-container");
      if (!contentContainer) return;

      const headingElements = contentContainer.querySelectorAll(
        "h1, h2, h3, h4, h5, h6"
      );
      const headings: TOCItem[] = [];

      headingElements.forEach((heading) => {
        const id =
          heading.id ||
          heading.textContent?.toLowerCase().replace(/\s+/g, "-") ||
          "";

        // Set id if it doesn't exist
        if (!heading.id) {
          heading.id = id;
        }

        headings.push({
          id: id,
          text: heading.textContent || "",
          level: parseInt(heading.tagName.substring(1)),
        });
      });

      setTableOfContents(headings);
    };

    // Wait for the content to be rendered
    setTimeout(extractHeadings, 100);
  }, [content]);

  // Track active heading on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (tableOfContents.length === 0) return;

      const headingElements = tableOfContents.map((heading) =>
        document.getElementById(heading.id)
      );

      const scrollPosition = window.scrollY + 100;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const currentHeading = headingElements[i];
        if (currentHeading && currentHeading.offsetTop <= scrollPosition) {
          setActiveHeading(tableOfContents[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [tableOfContents]);

  // Update TOC collapsed state from child component
  const handleTOCCollapse = (collapsed: boolean) => {
    setIsTOCCollapsed(collapsed);
  };

  const isDraft = post.status === "draft";

  // Indent headings relative to the shallowest one in the post, so a post that
  // only uses h3s doesn't push every row in for no reason.
  const tocMinLevel = tableOfContents.length
    ? Math.min(...tableOfContents.map((h) => h.level))
    : 1;

  // Detect headings from the raw MDX up front (not just the post-render DOM)
  // so posts without any headings skip the sidebar layout without a flicker.
  const hasTOC = /^#{1,6}\s|<h[1-6][\s>]/m.test(
    post.content.replace(/```[\s\S]*?```/g, "")
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Navigation - aligns with the article column in both layouts */}
      <div
        className={`mb-6 px-4 lg:px-0 ${
          hasTOC ? "" : "hidden lg:block lg:w-2/3 lg:mx-auto"
        }`}
      >
        <Link
          href="/blog"
          className="inline-flex items-center text-green-700 dark:text-green-500 hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to all posts</span>
        </Link>
      </div>

      {/* Mobile TOC & Like Button Trigger */}
      <div className="lg:hidden sticky top-0 z-30 overflow-hidden bg-background/85 px-4 py-3 backdrop-blur-md flex items-center justify-between md:relative">
        {hasTOC ? (
          <Popover open={tocOpen} onOpenChange={setTocOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="On this page"
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 data-[state=open]:bg-foreground/5"
              >
                <Menu size={16} />
                <span>Contents</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={10}
              collisionPadding={16}
              className="w-auto min-w-[9rem] max-w-[min(17rem,calc(100vw-2rem))] rounded-lg border-border bg-card p-1.5 shadow-lg"
            >
              <p className="px-2 pb-1 pt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>

              {tableOfContents.length > 0 ? (
                <nav className="no-scrollbar max-h-[min(60vh,18rem)] overflow-y-auto">
                  <ul className="flex flex-col">
                    {tableOfContents.map((heading) => {
                      const isActive = activeHeading === heading.id;
                      return (
                        <li
                          key={heading.id}
                          style={{
                            paddingLeft: `${
                              (heading.level - tocMinLevel) * 0.6
                            }rem`,
                          }}
                        >
                          <a
                            href={`#${heading.id}`}
                            className={`block rounded-md px-2 py-1 font-mono text-[13px] leading-snug transition-colors ${
                              isActive
                                ? "bg-foreground/5 font-medium text-green-700 dark:text-green-500"
                                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              document
                                .getElementById(heading.id)
                                ?.scrollIntoView({ behavior: "smooth" });
                              setTocOpen(false);
                            }}
                          >
                            {heading.text}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : (
                <p className="px-2 pb-1.5 type-caption">
                  No headings in this post.
                </p>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <Link
            href="/blog"
            className="inline-flex items-center text-green-700 dark:text-green-500 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to all posts</span>
          </Link>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <ThreeDLikeButton slug={post.slug} compact />
        </motion.div>

        <div className="rule absolute inset-x-0 bottom-0" aria-hidden="true" />
      </div>

      <div className="flex flex-col lg:flex-row pt-7 lg:pt-0">
        {/* Main Content - Dynamic width based on TOC state */}
        <article
          className={`transition-all duration-500 ease-in-out w-full px-4 lg:px-0 ${
            hasTOC
              ? `${isTOCCollapsed ? "lg:w-[90%]" : "lg:w-2/3"} lg:pr-12`
              : "lg:w-2/3 lg:mx-auto"
          }`}
          ref={contentRef}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <header className="mb-5">
              <h1 className="type-display mb-2">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 type-caption">
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  <time dateTime={post.date}>
                    {format(new Date(post.date), "MMMM d, yyyy")}
                  </time>
                </div>

                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{post.readingTime}</span>
                </div>

                {/* View Counter */}
                <ViewCounter slug={post.slug} />

                {/* Like Button - inline on desktop when there's no TOC sidebar */}
                {!hasTOC && (
                  <div className="hidden lg:block ml-auto">
                    <ThreeDLikeButton slug={post.slug} />
                  </div>
                )}
              </div>

              {/* Hacker News Button */}
              {post.hnUrl && (
                <div className="mt-3 mb-5">
                  <HackerNewsButton url={post.hnUrl} />
                </div>
              )}
            </header>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            id="mdx-content-container"
            className="prose prose-green max-w-none dark:prose-invert 
            prose-headings:font-semibold
            prose-a:text-green-700 dark:prose-a:text-green-500
            prose-p:text-gray-700 dark:prose-p:text-muted-foreground
            prose-blockquote:border-green-500 dark:prose-blockquote:border-green-500 
            prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-muted/50"
          >
            {isDraft ? (
              <DraftPostIndicator previewParagraphs={10}>
                {content}
              </DraftPostIndicator>
            ) : (
              content
            )}
          </motion.div>

          {/* Hacker News discussion thread */}
          {post.hnUrl && <HackerNewsComments hnUrl={post.hnUrl} />}
        </article>

        {/* Right Sidebar - only rendered when the post actually has headings */}
        {hasTOC && (
        <aside
          className={`hidden lg:flex flex-col transition-all duration-500 ease-in-out ${
            isTOCCollapsed ? "lg:w-[10%]" : "lg:w-1/3"
          }`}
        >
          <div className="sticky top-32 space-y-8 w-full flex flex-col items-center">
            {/* Collapsible Table of Contents */}
            <CollapsibleTOC
              tableOfContents={tableOfContents}
              activeHeading={activeHeading}
              onCollapseChange={handleTOCCollapse}
            />

            {/* Like Button - Always visible */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`flex ${
                isTOCCollapsed
                  ? "justify-center mt-8"
                  : "justify-center pr-8 w-full"
              }`}
            >
              <ThreeDLikeButton slug={post.slug} />
            </motion.div>
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}
