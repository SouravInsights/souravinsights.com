import createMDX from "@next/mdx";
import rehypePrettyCode from "rehype-pretty-code";

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  theme: "github-dark",
  keepBackground: true,
  grid: true,

  onVisitLine(node) {
    if (node.children.length === 0) {
      node.children = [{ type: "text", value: " " }];
    }
  },

  onVisitHighlightedLine(node) {
    node.properties.className = ["line--highlighted"];
  },

  onVisitHighlightedWord(node) {
    node.properties.className = ["word--highlighted"];
  },
};

// Custom function to bypass sensitive content filters
const bypassContentFilter = () => {
  return (tree) => {
    // This is a no-op transformer that ensures content isn't filtered
    return tree;
  };
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [bypassContentFilter],
    rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
    providerImportSource: "@mdx-js/react",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  images: {
    domains: ["assets.literal.club", "books.google.com", "pbs.twimg.com"],
  },

  experimental: {
    // pdfkit (used by @react-pdf/renderer) loads its standard fonts through a
    // dynamic path, so the serverless file tracer never sees them. Without this
    // the /cv/pdf route crashes on Vercel with "Cannot find module
    // /var/task/node_modules/pdfkit/js/standard-fonts/Helvetica.cjs".
    outputFileTracingIncludes: {
      "/cv/pdf": [
        "./node_modules/pdfkit/js/standard-fonts/**/*",
        "./node_modules/pdfkit/js/data/**/*",
      ],
    },
  },
};

export default withMDX(nextConfig);
