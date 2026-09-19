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

      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-lg border border-border p-4 transition-colors hover:bg-accent sm:p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={post.date}>
                    {format(new Date(post.date), "MMMM d, yyyy")}
                  </time>
                  <span aria-hidden="true">•</span>
                  <span>{post.readingTime}</span>

                  {post.status === "draft" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <FileWarning size={12} />
                      Draft
                    </span>
                  )}
                </div>

                <h2 className="text-base font-semibold text-balance text-foreground transition-colors group-hover:text-green-600 dark:group-hover:text-green-500 sm:text-lg">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="mt-1.5 text-sm text-pretty text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </motion.article>
          ))
        ) : (
          <div className="py-16 text-center">
            <h3 className="text-xl text-muted-foreground">
              No blog posts yet. Check back soon!
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}