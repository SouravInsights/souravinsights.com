"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Highlights,
  type CreatePayload,
} from "./highlights/Highlights";
import { updateArticleMarks } from "./article-query";

/**
 * The article body plus the highlight system (docs/spec/insights-rebuild.md).
 *
 * Everyone sees the owner's marks. The owner (recognised by the same admin
 * key clean-up uses) also gets the palette. Marks render the instant they're
 * made — the write is a background call; if the key turns out wrong, the mark
 * is rolled back and say so plainly.
 */

export interface StoredHighlight {
  id: number;
  quote: string;
  occurrence: number;
  hue: number;
}

export function ArticleBody({
  urlKey,
  initialHighlights,
  children,
}: {
  urlKey: string;
  initialHighlights: StoredHighlight[];
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  /**
   * The palette is the owner's tool, so it only appears with the admin key —
   * and the key was only ever asked for on /insights?admin, in the list. Open
   * an article on a phone that never saw that URL and selecting text did
   * nothing at all: no prompt, no palette, no explanation. Now the reader
   * honours ?admin too, so the device in your hand can unlock itself.
   */
  useEffect(() => {
    const stored = window.localStorage.getItem("insights_admin_key");
    if (stored) {
      setAdminKey(stored);
      return;
    }
    if (!new URLSearchParams(window.location.search).has("admin")) return;
    const key = window.prompt("Admin key (stored in this browser only)");
    if (key) {
      window.localStorage.setItem("insights_admin_key", key);
      setAdminKey(key);
    }
  }, []);

  const onCreate = useCallback(
    async (payload: CreatePayload): Promise<number | null> => {
      if (!adminKey) return null;
      try {
        const response = await fetch("/api/insights/highlights", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${adminKey}`,
          },
          body: JSON.stringify({ urlKey, ...payload }),
        });
        if (response.status === 401) {
          window.localStorage.removeItem("insights_admin_key");
          setAdminKey(null);
          window.alert("Wrong admin key.");
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
    [adminKey, urlKey]
  );

  const onRecolor = useCallback(
    (rowId: number, hue: number) => {
      if (!adminKey) return;
      updateArticleMarks(urlKey, (marks) =>
        marks.map((m) => (m.id === rowId ? { ...m, hue } : m))
      );
      fetch("/api/insights/highlights", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ id: rowId, hue }),
      }).catch(() => undefined);
    },
    [adminKey, urlKey]
  );

  const onDelete = useCallback(
    (rowId: number) => {
      if (!adminKey) return;
      updateArticleMarks(urlKey, (marks) =>
        marks.filter((m) => m.id !== rowId)
      );
      fetch(`/api/insights/highlights?id=${rowId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminKey}` },
      }).catch(() => undefined);
    },
    [adminKey, urlKey]
  );

  return (
    <div className="relative" ref={containerRef}>
      {children}
      <Highlights
        containerRef={containerRef}
        admin={adminKey !== null}
        initialMarks={initialHighlights}
        onCreate={onCreate}
        onRecolor={onRecolor}
        onDelete={onDelete}
      />
    </div>
  );
}
