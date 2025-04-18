import fs from "fs";
import path from "path";

export interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  status?: "published" | "draft";
}

export interface PostData extends PostMetadata {
  content: string;
}

// Function to parse frontmatter from MDX content
function parseFrontmatter(fileContents: string) {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(fileContents);

  if (!match) return { matterData: {}, content: fileContents };

  const frontmatterText = match[1];
  const matterData: Record<string, any> = {};

  // Parse frontmatter lines
  frontmatterText.split("\n").forEach((line) => {
    const [key, ...valueArr] = line.split(":");
    if (key && valueArr.length > 0) {
      const value = valueArr.join(":").trim();
      if (key.trim() === "tags") {
        // Parse tags as array
        matterData[key.trim()] = value
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((tag) => tag.trim());
      } else {
        matterData[key.trim()] = value;
      }
    }
  });

  const content = fileContents.replace(frontmatterRegex, "").trim();

  return { matterData, content };
}

// Function to get all blog posts with metadata
export function getBlogPosts(): PostMetadata[] {
  const postsDirectory = path.join(process.cwd(), "src/content/posts");

  // Create directory if it doesn't exist (for development)
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
    return [];
  }

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((name) => name.endsWith(".mdx"));

  const allPostsData = fileNames.map((fileName) => {
    // Remove ".mdx" from file name to get slug
    const slug = fileName.replace(/\.mdx$/, "");

    // Read file contents
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    // Parse frontmatter
    const { matterData } = parseFrontmatter(fileContents);

    // Return post metadata with defaults for missing fields
    return {
      slug,
      title: matterData.title || "Untitled",
      date: matterData.date || new Date().toISOString(),
      excerpt: matterData.excerpt || "",
      tags: matterData.tags || [],
      readingTime: matterData.readingTime || "3 min read",
      status: matterData.status || "published",
    };
  });

  // Sort posts by date (newest first)
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Function to get a specific post by slug
export function getPostBySlug(slug: string): PostData | null {
  try {
    const postsDirectory = path.join(process.cwd(), "src/content/posts");
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");

    const { matterData, content } = parseFrontmatter(fileContents);

    return {
      slug,
      content,
      title: matterData.title || "Untitled",
      excerpt: matterData.excerpt || "",
      tags: matterData.tags || [],
      date: matterData.date || new Date().toISOString(),
      readingTime: matterData.readingTime || "3 min read",
      status: matterData.status || "published",
    };
  } catch (error) {
    console.error(`Error getting post by slug: ${slug}`, error);
    return null;
  }
}
