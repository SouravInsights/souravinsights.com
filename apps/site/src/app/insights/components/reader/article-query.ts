"use client";

/**
 * Reader articles, asked and cached through TanStack Query.
 *
 * `getArticle` dedupes; `prefetchArticle` warms on hover so the click feels
 * instant; `updateArticleMarks` is how highlight writes stay in the cache
 * without a refetch.
 * https://tanstack.com/query/v5/docs/framework/react/guides/prefetching
 */

import { queryClient } from "@/context/QueryProvider";
import { apiJson } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";
import type { StoredHighlight } from "./ArticleBody";

export interface ArticlePayload {
  id: number;
  url: string;
  urlKey: string;
  title: string;
  markdown: string;
  summary: string | null;
  wordCount: number | null;
  addedAt: string;
  marks: StoredHighlight[];
}

export const articleKey = (urlKey: string) => qk.article(urlKey);

async function fetchArticle(urlKey: string): Promise<ArticlePayload> {
  const json = await apiJson<{ data: ArticlePayload }>(
    `/api/insights/article?urlKey=${encodeURIComponent(urlKey)}`,
  );
  return json.data;
}

export const articleQuery = (urlKey: string) => ({
  queryKey: articleKey(urlKey),
  queryFn: () => fetchArticle(urlKey),
  gcTime: 30 * 60_000,
});

/** Warming on hover/focus: a click afterwards opens instantly. */
export function prefetchArticle(urlKey: string): void {
  void queryClient.prefetchQuery(articleQuery(urlKey));
}

/**
 * The Co-Reader's starter questions. Generated once per article server-side and
 * cached there; on this side they are just another cached read.
 */
export const questionsQuery = (urlKey: string) => ({
  queryKey: qk.articleQuestions(urlKey),
  queryFn: async () => {
    const json = await apiJson<{ data: { questions: string[] } }>(
      "/api/insights/article/questions",
      { method: "POST", body: JSON.stringify({ urlKey }) },
    );
    return json.data.questions;
  },
  staleTime: 30 * 60_000,
});

/** After a highlight write, the cached marks change without a refetch. */
export function updateArticleMarks(
  urlKey: string,
  mutate: (marks: StoredHighlight[]) => StoredHighlight[],
): void {
  queryClient.setQueryData<ArticlePayload>(articleKey(urlKey), (current) =>
    current ? { ...current, marks: mutate(current.marks) } : current,
  );
}
