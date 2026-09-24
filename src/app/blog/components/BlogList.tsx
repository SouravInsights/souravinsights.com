/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PostMetadata } from "../utils/blogUtils";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";
import { FileWarning } from "lucide-react";

interface BlogListProps {
  posts: PostMetadata[];
}

/**
 * Parse the date at local midnight so the rendered day is identical on the
 * server and the client, regardless of timezone.
 */
const formatPostDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : format(parsed, "MMM d, yyyy");
};

export default function BlogList({ posts }: BlogListProps) {
  return (
    <div>
      <FadeIn y={20} duration={0.3}>
        <PageHeader
          title="Notes &amp; Essays"
          description="Interactive tutorials, stories, deep dives on startups, movies, human behavior, and whatever random thing I get curious about at 2 AM 🦉"
        />
      </FadeIn>

      {posts.length > 0 ? (
        <div className="flex flex-col">
          {posts.map((post, index) => (
            <div key={post.slug}>
              {index > 0 && <div className="rule" aria-hidden="true" />}
              <FadeIn delay={Math.min(index, 12) * 0.03}>
                <Link href={`/blog/${post.slug}`} className="list-row group">
                  <span className="type-heading group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors min-w-0">
                    {post.title}
                  </span>

                  <span className="flex shrink-0 items-center gap-2 type-caption">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                    {post.status === "draft" && (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <FileWarning size={12} />
                        Draft
                      </span>
                    )}
                  </span>
                </Link>
              </FadeIn>
            </div>
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