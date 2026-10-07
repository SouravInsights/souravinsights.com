/**
 * Health checker for the links registry. One check cannot convict a URL —
 * verdicts follow the certainty ladder in docs/spec/links-registry-and-api.md:
 *
 *   DNS failure / connection refused  → dead      (gone for everyone)
 *   404 / 410                         → dead      (the site itself says so)
 *   403 / 429 / 401                   → uncheckable (bot wall; alive for humans)
 *   5xx / timeout / TLS error         → retry     (ambiguous; the weekly job's
 *                                                  3-strikes rule decides)
 *   2xx after ≤5 redirects            → alive     (final URL is recorded)
 */

export type HealthVerdict = "alive" | "dead" | "uncheckable" | "retry";

export interface HealthResult {
  verdict: HealthVerdict;
  /** Final URL after following redirects; equals the input when none happened. */
  finalUrl: string;
}

// A real browser UA — datacenter-identifying agents get walled by Cloudflare et al.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

const fetchOnce = (url: string, method: "HEAD" | "GET") =>
  fetch(url, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      // GET asks for the first bytes only — we classify, we don't read.
      ...(method === "GET" ? { range: "bytes=0-2048" } : {}),
    },
  });

function classify(status: number): HealthVerdict {
  if (status >= 200 && status < 300) return "alive";
  if (status === 404 || status === 410) return "dead";
  if (status === 401 || status === 403 || status === 429) return "uncheckable";
  return "retry"; // 5xx, odd 4xx, unexpected codes
}

function classifyNetworkError(err: unknown): HealthVerdict {
  const code = (err as { cause?: { code?: string } })?.cause?.code ?? "";
  // ENOTFOUND/EAI_AGAIN: the domain itself is gone. ECONNREFUSED: nothing is
  // listening. Both are provable death, not bot walls.
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ECONNREFUSED") {
    return "dead";
  }
  return "retry"; // timeouts (TimeoutError), TLS failures, aborts
}

export async function checkUrlHealth(inputUrl: string): Promise<HealthResult> {
  let url = inputUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    let res: Response;
    try {
      res = await fetchOnce(url, "HEAD");
    } catch (err) {
      return { verdict: classifyNetworkError(err), finalUrl: url };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { verdict: "retry", finalUrl: url };
      url = new URL(location, url).toString();
      continue;
    }

    // Some servers answer HEAD nonsense (403/405) while GET works fine.
    // Classify on a ranged GET before trusting anything but a clean 2xx.
    if (res.status >= 400) {
      try {
        const getRes = await fetchOnce(url, "GET");
        await getRes.body?.cancel();
        return { verdict: classify(getRes.status), finalUrl: url };
      } catch (err) {
        return { verdict: classifyNetworkError(err), finalUrl: url };
      }
    }

    return { verdict: "alive", finalUrl: url };
  }

  return { verdict: "retry", finalUrl: url }; // redirect loop
}

/** Small concurrency pool — the checker, not Promise.all(531 requests). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}
