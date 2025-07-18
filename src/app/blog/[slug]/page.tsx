import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import { getPostBySlug } from "../utils/blogUtils";
import BlogPostContent from "../components/BlogPostContent";
import Playground from "../components/Playground";

interface PostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PostPageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";
  const ogImageParams = new URLSearchParams({
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    readingTime: post.readingTime || "5 min read",
    draft: post.status === "draft" ? "true" : "false",
  });
  const ogImageUrl = `${baseUrl}/api/og?${ogImageParams.toString()}`;

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
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
      url: `${baseUrl}/blog/${params.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl],
      creator: "@souravinsights",
    },
  };
}

const prettyCodeOptions = {
  theme: "github-dark",
  keepBackground: false,
};

export default function PostPage({ params }: PostPageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const content = (
    <MDXRemote
      source={post.content}
      components={{ Playground }}
      options={{
        mdxOptions: {
          rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
        },
      }}
    />
  );

  return <BlogPostContent post={post} content={content} />;
}
