import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/app/lib/redis";

/** Public API: 60 requests/minute per IP. */
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:api",
});

/** Admin endpoints: 30 requests/minute. */
export const adminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:admin",
});

/**
 * Public agent: a model call is not a GET. Two limits — 8 questions/minute to
 * stop bursts, and 60/day so one visitor can't drain the OpenRouter balance.
 */
export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 m"),
  prefix: "rl:chat",
});

export const chatDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 d"),
  prefix: "rl:chat-day",
});

/**
 * Sharing a conversation: anyone may do it, and each one writes a public row.
 * Six per ten minutes from one address is far more than a person needs and far
 * less than a script wants.
 */
export const shareLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(6, "10 m"),
  prefix: "rl:share",
});

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "anonymous"
  );
}
