import React from "react";
import { getBlogPosts } from "./utils/blogUtils";
import BlogList from "./components/BlogList";

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="mx-auto max-w-5xl px-5 pb-10 pt-6 sm:px-6 sm:pt-8">
      <BlogList posts={posts} />
    </div>
  );
}
