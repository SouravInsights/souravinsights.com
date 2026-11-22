"use client";

import { memo } from "react";
import type { ComponentProps } from "react";
import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

/**
 * The markdown renderer for agent replies, kept out of `message.tsx` on purpose.
 *
 * `streamdown` and `@streamdown/code` import `shiki`, which ships as ESM only.
 * The insights page server-renders the chat shell, so a static import here made
 * Next `require()` shiki inside `/insights` and fail with ERR_REQUIRE_ESM.
 * `message.tsx` loads this module with `next/dynamic` + `ssr: false`, so the
 * highlighter stays in a browser chunk — where a code block is actually shown.
 */

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

// Only the `code` plugin: replies here are prose + links, and the others
// (cjk, math, mermaid) would install megabytes we never render.
const streamdownPlugins = { code };

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && nextProps.isAnimating === prevProps.isAnimating,
);

MessageResponse.displayName = "MessageResponse";
