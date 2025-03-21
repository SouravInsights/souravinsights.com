"use client";

import React from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { PostData } from "../utils/blogUtils";

interface BlogPostContentProps {
  post: PostData;
  content: React.ReactNode;
}

export default function BlogPostContent({
  post,
  content,
}: BlogPostContentProps) {
  return (
    <article className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/blog"
          className="inline-flex items-center text-green-600 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to all posts</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-x-4 text-sm text-gray-600 dark:text-gray-400">
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
          </div>
        </header>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
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
  );
}
