export function appendUTMParams(
  url: string,
  params: Record<string, string>
): string {
  try {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value);
    }
    return urlObj.toString();
  } catch {
    // fallback if invalid URL
    return url;
  }
}

/**
 * Canonical key for a link. Protocol, `www.` and a trailing slash are
 * cosmetic — the same page posted in two channels should collapse to one.
 */
export const normalizeUrl = (url: string) =>
  url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

/**
 * The link as you'd send it to a friend: tracking params dropped, everything
 * meaningful kept. `links.url` is stored as saved — normalizeUrl only derives
 * a key, it never touched the query — so stripping happens here, at copy time.
 */
const TRACKING_PARAMS = [
  /^utm_/,
  /^fbclid$/,
  /^gclid$/,
  /^igshid$/,
  /^mc_eid$/,
  /^mc_cid$/,
  /^ref$/,
  /^ref_src$/,
  /^twclid$/,
  /^si$/,
  /^source$/,
];

export function cleanShareUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const drop: string[] = [];
    parsed.searchParams.forEach((_value, key) => {
      if (TRACKING_PARAMS.some((pattern) => pattern.test(key.toLowerCase()))) {
        drop.push(key);
      }
    });
    for (const key of drop) parsed.searchParams.delete(key);
    const out = parsed.toString();
    // A query that emptied out should not leave its `?` behind.
    return out.endsWith("?") ? out.slice(0, -1) : out;
  } catch {
    return url;
  }
}

/** Newest first, by Discord snowflake id. */
export function sortByNewestId<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    try {
      return BigInt(b.id) > BigInt(a.id) ? 1 : -1;
    } catch {
      return b.id.localeCompare(a.id);
    }
  });
}

/** Oldest first — the inverse of sortByNewestId, used to surface stale links. */
export function sortByOldestId<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    try {
      return BigInt(a.id) > BigInt(b.id) ? 1 : -1;
    } catch {
      return a.id.localeCompare(b.id);
    }
  });
}

/**
 * Drop repeated URLs, keeping the first occurrence — callers sort newest
 * first beforehand, so the freshest copy of a link wins.
 */
export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Discord snowflakes encode their creation time — used for feed dates. */
const DISCORD_EPOCH = 1420070400000;

export function snowflakeDate(id: string): Date {
  try {
    return new Date(Number(BigInt(id) >> BigInt(22)) + DISCORD_EPOCH);
  } catch {
    return new Date();
  }
}

/**
 * Deterministic Fisher-Yates shuffle. Same seed → same order everywhere, which
 * is what lets the server and client agree on a shuffled list.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed || 1;

  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}
