/**
 * The one way the client calls this site's JSON API.
 *
 * Every screen used to hand-roll `fetch` + `if (!response.ok)` + `.json()`, so
 * each caller carried its own idea of what a failure looks like and some
 * swallowed one. This throws on any non-2xx and returns parsed JSON, so a
 * `useQuery`/`useMutation` gets a real error to surface and there is a single
 * place to change how the client talks to the API.
 *
 * TanStack Query does not fetch — it orchestrates. A `queryFn` is just a
 * function that returns a promise, and this is that function.
 * https://tanstack.com/query/v5/docs/framework/react/guides/query-functions
 */
export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} → ${response.status}`);
  }

  return (await response.json()) as T;
}
