import redis from "@/app/lib/redis";

/**
 * What Curio may spend in a day, across everyone.
 *
 * The per-address limits stop one visitor. They do nothing about a thousand
 * addresses, and there are no accounts here to suspend, so the only real ceiling
 * is a number for the whole day. Questions are counted because they are what a
 * visitor does; tokens are counted because they are what costs money.
 *
 * Both numbers are deliberately small enough to be uninteresting to abuse and
 * large enough that a normal day never touches them. A personal collection does
 * not need a thousand questions a day; if it ever does, that is a good day and
 * the numbers below can be raised on purpose.
 */
export const DAILY_QUESTION_CEILING = 400;
export const DAILY_TOKEN_BUDGET = 2_000_000;

/** Counters are dated, and forgotten two days later. */
const TTL_SECONDS = 60 * 60 * 48;

const today = () => new Date().toISOString().slice(0, 10);
const questionsKey = () => `curio:q:${today()}`;
const tokensKey = () => `curio:tokens:${today()}`;

export interface DailyUsage {
  questions: number;
  tokens: number;
  exhausted: boolean;
}

/** Today's spend so far. */
export async function readDailyUsage(): Promise<DailyUsage> {
  try {
    const [questions, tokens] = await Promise.all([
      redis.get<number>(questionsKey()),
      redis.get<number>(tokensKey()),
    ]);
    const asked = Number(questions ?? 0);
    const spent = Number(tokens ?? 0);
    return {
      questions: asked,
      tokens: spent,
      exhausted:
        asked >= DAILY_QUESTION_CEILING || spent >= DAILY_TOKEN_BUDGET,
    };
  } catch (error) {
    // Redis unreachable. Answer anyway and say so: refusing every question
    // because a counter cannot be read takes the feature down with a cache.
    console.warn("curio: budget unreadable, allowing the question", error);
    return { questions: 0, tokens: 0, exhausted: false };
  }
}

/** Count one answered question, and the tokens it used. */
export async function recordQuestion(totalTokens: number): Promise<void> {
  try {
    const questions = questionsKey();
    const tokens = tokensKey();
    await Promise.all([
      redis.incr(questions),
      redis.incrby(tokens, Math.max(1, Math.round(totalTokens))),
      redis.expire(questions, TTL_SECONDS),
      redis.expire(tokens, TTL_SECONDS),
    ]);
  } catch (error) {
    console.warn("curio: budget not recorded", error);
  }
}
