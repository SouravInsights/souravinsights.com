"use client";

import React, { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Menu,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { PostData } from "../utils/blogUtils";
import ThreeDLikeButton from "./ThreeDLikeButton";
import ViewCounter from "./ViewCounter";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Navigation */}
      <div className="mb-6 px-4 lg:px-0">
        <Link
          href="/blog"
          className="inline-flex items-center text-green-600 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to all posts</span>
        </Link>
      </div>

      {/* Mobile TOC & Like Button Trigger */}
      <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
        >
          <Menu size={16} />
          <span>Contents</span>
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <ThreeDLikeButton slug={post.slug} />
        </motion.div>
      </div>

      {/* Mobile TOC Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-gray-500/50 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-xs bg-white dark:bg-gray-800 shadow-xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Table of Contents
              </h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            {tableOfContents.length > 0 && (
              <nav>
                <ul className="space-y-2">
                  {tableOfContents.map((heading) => (
                    <li
                      key={heading.id}
                      style={{
                        marginLeft: `${(heading.level - 1) * 0.75}rem`,
                      }}
                    >
                      <a
                        href={`#${heading.id}`}
                        className={`text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors block py-1 ${
                          activeHeading === heading.id
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(heading.id)?.scrollIntoView({
                            behavior: "smooth",
                          });
                          setMobileMenuOpen(false);
                        }}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row pt-12 lg:pt-0">
        {/* Main Content */}
        <article
          className="w-full lg:w-2/3 px-4 lg:px-0 lg:pr-12"
          ref={contentRef}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
              </div>
            </header>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            id="mdx-content-container"
            className="prose prose-green max-w-none dark:prose-invert 
            prose-headings:font-semibold
            prose-a:text-green-600 dark:prose-a:text-green-400
            prose-p:text-gray-700 dark:prose-p:text-gray-300
            prose-blockquote:border-green-500 dark:prose-blockquote:border-green-400 
            prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50"
          >
            {content}
          </motion.div>
        </article>

        {/* Right Sidebar - Desktop Only */}
        <aside className="hidden lg:block w-1/3">
          <div className="sticky top-8 space-y-8">
            {/* Table of Contents */}
            {tableOfContents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center">
                  <div className="flex space-x-2 mr-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    toc.md
                  </span>
                </div>

                <div className="p-4">
                  <nav className="overflow-y-auto max-h-[70vh] font-mono">
                    <ul className="space-y-1">
                      {tableOfContents.map((heading) => (
                        <li
                          key={heading.id}
                          style={{
                            marginLeft: `${(heading.level - 1) * 0.75}rem`,
                          }}
                        >
                          <a
                            href={`#${heading.id}`}
                            className={`text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors flex items-center py-1 truncate ${
                              activeHeading === heading.id
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              document
                                .getElementById(heading.id)
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                });
                            }}
                          >
                            {activeHeading === heading.id && (
                              <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
                            )}
                            <span className="truncate">{heading.text}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </motion.div>
            )}

            {/* Like Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex justify-center pr-8"
            >
              <ThreeDLikeButton slug={post.slug} />
            </motion.div>
          </div>
        </aside>
      </div>
    </div>
  );
}
