import { PostMetadata } from "./blogUtils";

export function generateOGImageUrl(
  post: PostMetadata,
  baseUrl: string = ""
): string {
  const params = new URLSearchParams({
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    readingTime: post.readingTime || "5 min read",
    draft: post.status === "draft" ? "true" : "false",
  });

  // Add tags if they exist (comma-separated)
  if (post.tags && post.tags.length > 0) {
    params.set("tags", post.tags.slice(0, 3).join(","));
  }

  return `${baseUrl}/api/og?${params.toString()}`;
}

export function generateBlogMetadata(
  post: PostMetadata,
  slug: string,
  baseUrl: string = ""
) {
  const ogImageUrl = generateOGImageUrl(post, baseUrl);
  const postUrl = `${baseUrl}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article" as const,
      publishedTime: post.date,
      authors: ["Sourav Kumar Nanda"],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      siteName: "Notes & Essays",
      url: postUrl,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl],
      creator: "@souravinsights",
    },
  };
}
