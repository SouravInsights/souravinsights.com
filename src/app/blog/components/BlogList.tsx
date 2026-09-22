/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { PostMetadata } from "../utils/blogUtils";
import { PageHeader } from "@/components/PageHeader";
import { FileWarning } from "lucide-react";

interface BlogListProps {
  posts: PostMetadata[];
}

/**
 * Parse the date at local midnight so the rendered day is identical on the
 * server and the client, regardless of timezone.
 */
const formatPostDate = (date: string) =>
  format(new Date(`${date}T00:00:00`), "MMM d, yyyy");

export default function BlogList({ posts }: BlogListProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader
          title="Notes &amp; Essays"
          description="Interactive tutorials, stories, deep dives on startups, movies, human behavior, and whatever random thing I get curious about at 2 AM 🦉"
        />
      </motion.div>

      {posts.length > 0 ? (
        <div className="flex flex-col">
          {posts.map((post, index) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="list-row group"
              >
                <span className="type-heading group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                  {post.title}
                </span>

                <span className="flex shrink-0 items-center gap-2 type-caption">
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  {post.status === "draft" && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <FileWarning size={12} />
                      Draft
                    </span>
                  )}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h3 className="type-title text-muted-foreground">
            No blog posts yet. Check back soon!
          </h3>
        </div>
      )}
    </div>
  );
}