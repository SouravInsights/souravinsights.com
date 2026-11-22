import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import { getPostBySlug, getBlogPosts } from "../utils/blogUtils";
import { generateOGImageUrl } from "../utils/ogUtils";
import { generateBlogMetadata } from "../utils/ogUtils";
import BlogPostContent from "../components/BlogPostContent";
import Playground from "../components/PlaygroundClient";
import GistLink from "../components/GistLink";
import SideBySide from "../components/SideBySide";
import HtmlNestingVisualizer from "../components/HtmlNestingVisualizer";
import DomTreeAnimator from "../components/DomTreeAnimator";
import VideoPlayer from "../components/VideoPlayer";
import BlogImage from "../components/BlogImage";
import TweetEmbed from "../components/TweetEmbed";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";
  return generateBlogMetadata(post, slug, baseUrl);
}

const prettyCodeOptions = {
  theme: "github-dark",
  keepBackground: false,
};

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const content = (
    <MDXRemote
      source={post.content}
      components={{
        Playground,
        GistLink,
        SideBySide,
        HtmlNestingVisualizer,
        DomTreeAnimator,
        VideoPlayer,
        TweetEmbed,
        img: BlogImage,
      }}
      options={{
        mdxOptions: {
          rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
        },
      }}
    />
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";
  const ogImageUrl = generateOGImageUrl(post, baseUrl);

  // JSON-LD for SEO: Helps search engines understand the blog post structure,
  // enabling rich snippets like article cards and author bylines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    datePublished: post.date,
    dateModified: post.date,
    image: ogImageUrl,
    author: {
      "@type": "Person",
      name: "SouravInsights",
    },
    url: `${baseUrl}/blog/${slug}`,
  };

  return (
    <div className="mx-auto max-w-7xl px-0 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostContent post={post} content={content} />
    </div>
  );
}
