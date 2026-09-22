import React from "react";
import { getBlogPosts } from "./utils/blogUtils";
import BlogList from "./components/BlogList";

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="mx-auto max-w-3xl">
      <BlogList posts={posts} />
    </div>
  );
}
