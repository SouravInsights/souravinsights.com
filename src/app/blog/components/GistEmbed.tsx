import { MDXRemote } from "next-mdx-remote/rsc";
import ExpandableSection from "./ExpandableSection";
import rehypePrettyCode from "rehype-pretty-code";

interface GistEmbedProps {
  id: string;
  file?: string;
}

const prettyCodeOptions = {
  theme: {
    dark: "github-dark",
    light: "github-light",
  },
  keepBackground: false,
};

export default async function GistEmbed({ id, file }: GistEmbedProps) {
  // Construct the API URL to fetch Gist data
  const apiUrl = `https://api.github.com/gists/${id}`;
  
  try {
    const res = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return (
        <div className="p-4 my-4 border border-destructive/50 bg-destructive/10 text-destructive rounded">
          Failed to load Gist.
        </div>
      );
    }

    const data = await res.json();
    
    // If a specific file is requested, look for it, otherwise grab the first one
    const targetFile = file 
      ? data.files[file] 
      : Object.values(data.files)[0];

    if (!targetFile) {
        return (
            <div className="p-4 my-4 border border-destructive/50 bg-destructive/10 text-destructive rounded">
              File not found in Gist.
            </div>
          );
    }

    const content = (targetFile as any).content;
    const filename = (targetFile as any).filename;
    const gistUrl = (targetFile as any).raw_url ? data.html_url : null;

    return (
      <ExpandableSection gistUrl={gistUrl} title={filename}>
        <div className="prose prose-sm prose-green max-w-none dark:prose-invert">
          <MDXRemote
            source={content}
            options={{
              mdxOptions: {
                rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
              },
            }}
          />
        </div>
      </ExpandableSection>
    );

  } catch (error) {
    console.error("Error fetching gist:", error);
    return (
        <div className="p-4 my-4 border border-destructive/50 bg-destructive/10 text-destructive rounded">
          Error loading Gist content.
        </div>
      );
  }
}
