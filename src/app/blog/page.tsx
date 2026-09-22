import React from "react";
import { getBlogPosts } from "./utils/blogUtils";
import BlogList from "./components/BlogList";

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-32">
      <BlogList posts={posts} />
    </div>
  );
}
