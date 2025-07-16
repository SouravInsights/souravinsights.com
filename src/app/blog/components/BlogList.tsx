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
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Interactive coding tutorials, stories, deep-dive explainers, startup
            insights, movie analysis, essays on curiosity, human behavior, and
            anything I'm curious about.
          </p>
        </header>
      </motion.div>

      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700"
            >
              <Link href={`/blog/${post.slug}`} className="block p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {post.title}
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {post.excerpt}
                </p>

                <div className="inline-flex px-3 py-1 text-sm rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                  Read article
                </div>
              </Link>
            </motion.article>
          ))
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl text-gray-600 dark:text-gray-400">
              No blog posts yet. Check back soon!
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
