/**
 * Deterministic shuffle. Same seed, same order — so a server-rendered list and
 * its client copy agree, and a reload inside the seed's window does not jump.
 * The insights collection and the gallery both use it to surface a different
 * slice of the list on each visit instead of the same first few items.
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
