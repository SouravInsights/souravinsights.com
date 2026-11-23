"use client";

import React, { useCallback, useRef } from "react";
import { Highlight, type CreatePayload } from "@/components/highlight/highlight";
import type { HighlightRailItem } from "@/components/highlight/highlight-rail";
import { updateArticleMarks } from "./article-query";

/**
 * The article body plus the highlight system (docs/spec/insights-rebuild.md).
 *
 * Everyone sees the owner's marks and everyone gets the palette, exactly like
 * the blog. Only the owner's marks persist — recognised by the same admin
 * session as every other write. Marks render the instant they're made; the
 * write is a background call, and a 401 rolls the mark back and says so plainly.
 */

export interface StoredHighlight {
  id: number;
  quote: string;
  occurrence: number;
  hue: number;
}

export function ArticleBody({
  urlKey,
  isAdmin,
  initialHighlights,
  onShareQuote,
  onOpenNotebook,
  onTicks,
  children,
}: {
  urlKey: string;
  isAdmin: boolean;
  initialHighlights: StoredHighlight[];
  onShareQuote: (payload: { quote: string; context: string }) => void;
  onOpenNotebook?: () => void;
  onTicks?: (ticks: HighlightRailItem[]) => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const onCreate = useCallback(
    async (payload: CreatePayload): Promise<number | null> => {
      if (!isAdmin) return null;
      try {
        const response = await fetch("/api/insights/highlights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urlKey, ...payload }),
        });
        if (response.status === 401) {
          window.alert("Admin session expired. Sign in again at /login.");
          return null;
        }
        if (!response.ok) return null;
        const { data } = (await response.json()) as { data: { id: number } };
        updateArticleMarks(urlKey, (marks) => [
          ...marks,
          {
            id: data.id,
            quote: payload.quote,
            occurrence: payload.occurrence,
            hue: payload.hue,
          },
        ]);
        return data.id;
      } catch {
        return null;
      }
    },
    [isAdmin, urlKey],
  );

  const onRecolor = useCallback(
    (rowId: number, hue: number) => {
      if (!isAdmin) return;
      updateArticleMarks(urlKey, (marks) => marks.map((m) => (m.id === rowId ? { ...m, hue } : m)));
      fetch("/api/insights/highlights", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: rowId, hue }),
      }).catch(() => undefined);
    },
    [isAdmin, urlKey],
  );

  const onDelete = useCallback(
    (rowId: number) => {
      if (!isAdmin) return;
      updateArticleMarks(urlKey, (marks) => marks.filter((m) => m.id !== rowId));
      fetch(`/api/insights/highlights?id=${rowId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    },
    [isAdmin, urlKey],
  );

  return (
    <>
      <div className="relative" ref={containerRef}>
        {children}
      </div>
      {/* A sibling of the article, as on the blog: the engine's own live region
          must not end up in the paragraph list it scans. */}
      <Highlight
        containerRef={containerRef}
        editable
        initialMarks={initialHighlights}
        onCreate={onCreate}
        onRecolor={onRecolor}
        onDelete={onDelete}
        onShareQuote={onShareQuote}
        onOpenNotebook={onOpenNotebook}
        onTicks={onTicks}
      />
    </>
  );
}
