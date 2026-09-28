"use client";

import React from "react";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BlogImageProps {
  src?: string;
  alt?: string;
  /** From the markdown title slot: ![alt](src "caption") */
  title?: string;
}

/**
 * Editorial figure for essay images (quotes, diagrams, photos), applied to
 * every markdown image via the `img` override in MDXRemote.
 *
 * Deliberately plainer than SideBySide, which speaks "app screenshot":
 * no frames, labels or aspect crops — just a hairline border so light
 * images don't bleed into the page, and a quiet zoom affordance since
 * these images often carry text worth reading up close.
 *
 * Built from button/span rather than figure/figcaption because markdown
 * images render inside a <p>, which only accepts phrasing content.
 * The caption (markdown title attribute) sits outside the zoom trigger so
 * clicking it doesn't open the dialog.
 */
export default function BlogImage({ src, alt = "", title }: BlogImageProps) {
  if (!src) return null;

  return (
    <span className="my-8 block sm:my-10">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative block w-full cursor-zoom-in"
            aria-label={alt ? `View larger: ${alt}` : "View image larger"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="my-0 w-full rounded-lg border border-border bg-card transition-colors duration-200 group-hover:border-foreground/25"
            />
            <span className="absolute right-2 top-2 rounded-md border border-border bg-background/80 p-1.5 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
              <Expand size={14} className="text-muted-foreground" />
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-5xl rounded-xl border-border bg-background/95 p-2 shadow-2xl backdrop-blur-sm sm:p-3 [&>button]:hidden">
          <DialogTitle className="sr-only">{title || alt || "Image"}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-auto max-h-[82vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
      {title && (
        <span className="type-caption mt-3 block text-center">{title}</span>
      )}
    </span>
  );
}
