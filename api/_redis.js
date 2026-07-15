import { Redis } from "@upstash/redis";

// Shared store for push subscriptions. Works with either a Vercel KV
// integration (KV_REST_API_*) or a direct Upstash Redis (UPSTASH_REDIS_REST_*).
// Files prefixed with "_" are not treated as routes by Vercel.
export const SUBS_KEY = "syncpulse:subs";

export function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Set KV_REST_API_URL/KV_REST_API_TOKEN " +
        "(Vercel KV) or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return new Redis({ url, token });
}
