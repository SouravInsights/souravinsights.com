import createMDX from "@next/mdx";
import rehypePrettyCode from "rehype-pretty-code";

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  // Use a popular theme
  theme: "github-dark",

  // OR if you want to use a different theme for light/dark mode:
  // theme: { light: 'github-light', dark: 'github-dark' },

  // Keep the background in code blocks
  keepBackground: true,

  // Enable code copy button
  grid: true,

  // Enable line numbers
  // lineNumbers: true,

  // Callback to customize the rendering of code lines
  onVisitLine(node) {
    // Prevent lines from collapsing in `display: grid` mode,
    // and allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: "text", value: " " }];
    }
  },

  // Callback to customize the rendering of highlighted lines
  onVisitHighlightedLine(node) {
    // Add a class to highlighted lines
    node.properties.className = ["line--highlighted"];
  },

  // Callback to customize the rendering of highlighted words
  onVisitHighlightedWord(node) {
    // Add a class to highlighted words
    node.properties.className = ["word--highlighted"];
  },
};

const withMDX = createMDX({
  // Add markdown plugins here
  options: {
    remarkPlugins: [],
    rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
    // This is important for handling client components in MDX
    providerImportSource: "@mdx-js/react",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure pageExtensions to include md and mdx
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Current config for images
  images: {
    domains: ["assets.literal.club", "books.google.com", "pbs.twimg.com"],
  },
};

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
