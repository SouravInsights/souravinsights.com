/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { PostMetadata } from "../utils/blogUtils";
import { FileWarning } from "lucide-react";

interface BlogListProps {
  posts: PostMetadata[];
}

export default function BlogList({ posts }: BlogListProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-10 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Notes &amp; Essays
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Interactive tutorials, stories, deep dives on startups, movies,
            human behavior, and whatever random thing I get curious about at
            2 AM 🦉
          </p>
        </header>
      </motion.div>

      <div className="space-y-4 sm:space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="rounded-lg overflow-hidden border border-border transition-colors hover:bg-accent/50"
            >
              <Link href={`/blog/${post.slug}`} className="group block p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <time dateTime={post.date}>
                      {format(new Date(post.date), "MMMM d, yyyy")}
                    </time>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>

                  {/* Draft Badge */}
                  {post.status === "draft" && (
                    <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                      <FileWarning
                        size={12}
                        className="text-amber-600 dark:text-amber-400"
                      />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        Draft
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-balance text-foreground mb-1.5 sm:mb-3 transition-colors group-hover:text-green-600 dark:group-hover:text-green-500">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="text-sm sm:text-base text-pretty text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </motion.article>
          ))
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl text-muted-foreground">
              No blog posts yet. Check back soon!
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
