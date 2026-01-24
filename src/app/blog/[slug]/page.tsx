import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import { getPostBySlug, getBlogPosts } from "../utils/blogUtils";
import { generateBlogMetadata } from "../utils/ogUtils";
import BlogPostContent from "../components/BlogPostContent";
import dynamic from "next/dynamic";

const Playground = dynamic(() => import("../components/Playground"), {
  ssr: false,
  loading: () => (
    <div className="my-8 h-[350px] w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse border border-gray-200 dark:border-gray-700" />
  ),
});

interface PostPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
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
  return generateBlogMetadata(post, params.slug, baseUrl);
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

  // JSON-LD for SEO: Helps search engines understand the blog post structure,
  // enabling rich snippets like article cards and author bylines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: "SouravInsights",
    },
    url: `https://www.souravinsights.com/blog/${params.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostContent post={post} content={content} />
    </>
  );
}
