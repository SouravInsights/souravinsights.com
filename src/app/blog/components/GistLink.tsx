import Link from "next/link";
import { FileCode } from "lucide-react";

interface GistLinkProps {
  id: string;
  title?: string;
  description?: string;
}

export default async function GistLink({ id, title, description }: GistLinkProps) {
  const gistUrl = `https://gist.github.com/${id}`;
  
  return (
    <div className="my-8 rounded-lg border border-border bg-card overflow-hidden hover:border-accent transition-colors not-prose">
      <Link
        href={gistUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-5 group no-underline"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 p-2.5 rounded-lg bg-accent/10">
            <FileCode size={20} className="text-accent-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground mb-1 no-underline">
              {title || "View Gist"}
            </div>
            {description && (
              <div className="text-xs text-muted-foreground line-clamp-1 no-underline">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors px-3 py-1.5 rounded-md bg-muted group-hover:bg-accent/50 no-underline">
            View
          </span>
        </div>
      </Link>
    </div>
  );
}
