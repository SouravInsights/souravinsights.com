import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypePrettyCode from "rehype-pretty-code";
import { getPostBySlug } from "../utils/blogUtils";
import { generateBlogMetadata } from "../utils/ogUtils";
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

  return <BlogPostContent post={post} content={content} />;
}
