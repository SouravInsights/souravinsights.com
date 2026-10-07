import { embedMany } from "ai";
import { embeddingModel } from "./model";

/**
 * Turn text into vectors via OpenRouter's embeddings endpoint.
 *
 * Two practical concerns this wraps:
 * - Providers cap how many inputs fit in one request. We send them in bounded
 *   batches so a big backfill can't fail mid-run on a size limit.
 * - Embeddings occasionally 429/5xx. We retry with backoff; the whole backfill
 *   is idempotent, so even a hard failure just means "run it again".
 */

const BATCH_SIZE = 100;
const MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedBatch(values: string[]): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { embeddings } = await embedMany({
        model: embeddingModel(),
        values,
      });
      return embeddings;
    } catch (error) {
      lastError = error;
      // 0.5s, 1s, 2s, 4s (+ jitter) between tries.
      await sleep(2 ** attempt * 500 + Math.floor(Math.random() * 250));
    }
  }

  throw lastError;
}

/** Embed many values, in bounded batches. Order matches the input. */
export async function embedTexts(values: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    out.push(...(await embedBatch(values.slice(i, i + BATCH_SIZE))));
  }
  return out;
}

/** Embed a single value — used at query time to embed the question. */
export async function embedOne(value: string): Promise<number[]> {
  const [vector] = await embedTexts([value]);
  return vector;
}
