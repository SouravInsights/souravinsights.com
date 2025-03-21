import React from "react";
import { getBlogPosts } from "./utils/blogUtils";
import BlogList from "./components/BlogList";

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="max-w-3xl mx-auto">
      <BlogList posts={posts} />
    </div>
  );
}
